// =============================================
// One inbox for Messenger, Instagram and WhatsApp.
//
// Messenger and Instagram are read live from Meta: the Page's own conversation
// list is the source of truth for who wrote and when, names included, and it
// does not depend on the webhook having caught every message. WhatsApp has no
// such list in the Cloud API, so it comes from the log the webhook keeps.
//
// Replies are not sent from here — they go through sendSocialReply() and
// sendWhatsAppText(), which also record the message and pause the assistant.
//
// Meta answers in seconds, not milliseconds, so the Meta half is held in memory
// and refreshed in the background: the page opens on what is already known and
// the fresh data lands on the next poll. A read that returns nothing is never
// kept over one that returned something.
// =============================================

import prisma from "@/lib/prisma";

const GRAPH = "https://graph.facebook.com/v21.0";
const PAGE_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN || "";
const PAGE_ID = process.env.FACEBOOK_PAGE_ID || "";
const IG_ID = process.env.INSTAGRAM_USER_ID || "";

/** "me" resolves to the Page when the token is a Page token. */
const PAGE = PAGE_ID || "me";

/** One call that does not answer must not hold up the whole inbox. */
const CALL_TIMEOUT_MS = 20_000;
const FRESH_MS = 20_000;
const THREAD_FRESH_MS = 10_000;

export type InboxPlatform = "messenger" | "instagram" | "whatsapp";

export interface InboxConversation {
  /** Meta's conversation id, or "wa:<phone>" for WhatsApp. */
  id: string;
  platform: InboxPlatform;
  updatedTime: string | null;
  unreadCount: number;
  snippet: string;
  /** True when the last message is ours, null when we could not tell. */
  lastFromPage: boolean | null;
  person: { id: string | null; name: string; username: string | null };
  lead: { id: string; status: string; name: string | null } | null;
}

export interface InboxMessage {
  id: string;
  createdTime: string | null;
  text: string;
  fromPage: boolean;
  fromName: string;
}

export function isInboxConfigured(): boolean {
  return Boolean(PAGE_TOKEN);
}

// ---- Meta Graph ----

interface GraphError extends Error {
  code?: number;
}

async function fetchWithTimeout(url: URL): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CALL_TIMEOUT_MS);
  try {
    return await fetch(url, {
      headers: { Authorization: `Bearer ${PAGE_TOKEN}` },
      cache: "no-store",
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Meta nu a răspuns în ${CALL_TIMEOUT_MS / 1000} secunde`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function graph<T>(
  path: string,
  params: Record<string, string | number | undefined> = {},
): Promise<T> {
  const url = new URL(`${GRAPH}/${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") url.searchParams.set(key, String(value));
  }

  const res = await fetchWithTimeout(url);
  const json = (await res.json().catch(() => ({}))) as {
    error?: { message?: string; code?: number };
  } & T;

  if (json.error) {
    const error: GraphError = new Error(json.error.message || "Eroare Meta API");
    error.code = json.error.code;
    throw error;
  }
  return json;
}

interface RawParticipant {
  id: string;
  name?: string;
  username?: string;
}

interface RawConversation {
  id: string;
  updated_time?: string;
  message_count?: number;
  unread_count?: number;
  snippet?: string;
  participants?: { data?: RawParticipant[] };
}

interface RawMessage {
  id: string;
  created_time?: string;
  message?: string;
  from?: RawParticipant;
}

const clean = (value: unknown) => (typeof value === "string" ? value.trim() : "");

// Instagram returns no snippet, unread_count or message_count, and asking for
// them only makes the call fail — its last message is fetched separately.
const CONVERSATION_FIELDS: Record<"messenger" | "instagram", string> = {
  messenger: "id,updated_time,message_count,unread_count,snippet,participants",
  instagram: "id,updated_time,participants",
};

/** Everyone in the conversation who is not us: the Page, or its Instagram account. */
function otherParticipant(
  participants: { data?: RawParticipant[] } | undefined,
): InboxConversation["person"] {
  const ours = new Set([PAGE_ID, IG_ID].filter(Boolean));
  const list = participants?.data ?? [];
  const other = list.find((p) => !ours.has(p.id)) ?? list[0];
  return {
    id: other?.id ?? null,
    name: clean(other?.name) || clean(other?.username) || "Necunoscut",
    username: clean(other?.username) || null,
  };
}

function toConversation(
  raw: RawConversation,
  platform: "messenger" | "instagram",
): InboxConversation {
  return {
    id: raw.id,
    platform,
    updatedTime: raw.updated_time ?? null,
    unreadCount: raw.unread_count ?? 0,
    snippet: clean(raw.snippet),
    lastFromPage: null,
    person: otherParticipant(raw.participants),
    lead: null,
  };
}

/**
 * Instagram refuses the participants edge at page sizes above one on some
 * accounts. Asked for a normal page first, and walked one at a time when Meta
 * refuses — slower, but it is only the fallback.
 */
async function fetchConversations(
  platform: "messenger" | "instagram",
  limit = 30,
): Promise<InboxConversation[]> {
  const fields = CONVERSATION_FIELDS[platform];

  try {
    const res = await graph<{ data?: RawConversation[] }>(`${PAGE}/conversations`, {
      platform,
      fields,
      limit,
    });
    return (res.data ?? []).map((c) => toConversation(c, platform));
  } catch (error) {
    if (platform !== "instagram") throw error;
  }

  const out: RawConversation[] = [];
  let after: string | undefined;
  for (let i = 0; i < Math.min(limit, 15); i++) {
    const res = await graph<{
      data?: RawConversation[];
      paging?: { cursors?: { after?: string }; next?: string };
    }>(`${PAGE}/conversations`, { platform, fields, limit: 1, after });
    out.push(...(res.data ?? []));
    after = res.paging?.cursors?.after;
    if (!res.paging?.next) break;
  }
  return out.map((c) => toConversation(c, platform));
}

/** The text of the last message, for the conversations Meta gives none for. */
async function withPreviews(
  conversations: InboxConversation[],
  max = 30,
): Promise<InboxConversation[]> {
  const ours = new Set([PAGE_ID, IG_ID].filter(Boolean));
  const target = conversations.filter((c) => !c.snippet).slice(0, max);
  if (target.length === 0) return conversations;

  const results = await Promise.allSettled(
    target.map((c) =>
      graph<{ data?: RawMessage[] }>(`${c.id}/messages`, {
        fields: "message,from,created_time",
        limit: 1,
      }),
    ),
  );

  const byId = new Map<string, Partial<InboxConversation>>();
  target.forEach((c, i) => {
    const res = results[i];
    if (res.status !== "fulfilled") return;
    const last = res.value.data?.[0];
    if (!last) return;
    byId.set(c.id, {
      snippet: clean(last.message),
      lastFromPage: ours.has(last.from?.id ?? ""),
    });
  });

  return conversations.map((c) => (byId.has(c.id) ? { ...c, ...byId.get(c.id) } : c));
}

/** A conversation's messages, oldest first. */
async function fetchMessages(conversationId: string, limit = 50): Promise<InboxMessage[]> {
  const res = await graph<{ data?: RawMessage[] }>(`${conversationId}/messages`, {
    fields: "id,created_time,from,message",
    limit,
  });
  const ours = new Set([PAGE_ID, IG_ID].filter(Boolean));

  // Meta returns newest first; a chat reads the other way round.
  return (res.data ?? [])
    .map((m) => ({
      id: m.id,
      createdTime: m.created_time ?? null,
      text: clean(m.message),
      fromPage: ours.has(m.from?.id ?? ""),
      fromName: clean(m.from?.name) || clean(m.from?.username) || "—",
    }))
    .reverse();
}

// ---- The Meta half, held in memory ----

interface MetaSnapshot {
  conversations: InboxConversation[];
  errors: string[];
  fetchedAt: string;
}

let snapshot: { data: MetaSnapshot; at: number } | null = null;
let refreshing: Promise<MetaSnapshot> | null = null;

async function loadMeta(): Promise<MetaSnapshot> {
  const [messenger, instagram] = await Promise.allSettled([
    fetchConversations("messenger"),
    fetchConversations("instagram"),
  ]);

  const conversations: InboxConversation[] = [];
  const errors: string[] = [];
  for (const [platform, res] of [
    ["Messenger", messenger],
    ["Instagram", instagram],
  ] as const) {
    if (res.status === "fulfilled") conversations.push(...res.value);
    else errors.push(`${platform}: ${res.reason?.message ?? "eroare"}`);
  }

  conversations.sort(
    (a, b) => Date.parse(b.updatedTime ?? "") - Date.parse(a.updatedTime ?? ""),
  );

  const previewed = await withPreviews(conversations).catch(() => conversations);
  return { conversations: previewed, errors, fetchedAt: new Date().toISOString() };
}

// The last good read is also kept in the database. A serverless instance that
// has just started has nothing in memory, and Meta takes seconds — this lets
// the page open on the previous read while the new one is fetched.
const SNAPSHOT_KEY = "snapshot";

async function readStoredSnapshot(): Promise<MetaSnapshot | null> {
  try {
    const row = await prisma.inboxState.findUnique({ where: { key: SNAPSHOT_KEY } });
    return row ? (JSON.parse(row.value) as MetaSnapshot) : null;
  } catch {
    return null;
  }
}

function storeSnapshot(data: MetaSnapshot) {
  const value = JSON.stringify(data);
  prisma.inboxState
    .upsert({
      where: { key: SNAPSHOT_KEY },
      create: { key: SNAPSHOT_KEY, value },
      update: { value },
    })
    .catch((error) => console.warn("[inbox] could not store snapshot:", error));
}

function refreshMeta(): Promise<MetaSnapshot> {
  if (refreshing) return refreshing;

  refreshing = loadMeta()
    .then((data) => {
      // Never replace something with nothing because a read failed.
      const worse = data.conversations.length === 0 && data.errors.length > 0;
      if (!(worse && snapshot)) {
        snapshot = { data, at: Date.now() };
        if (data.conversations.length > 0) storeSnapshot(data);
      }
      return worse && snapshot ? snapshot.data : data;
    })
    .finally(() => {
      refreshing = null;
    });

  return refreshing;
}

async function metaSnapshot(force: boolean): Promise<MetaSnapshot> {
  if (!PAGE_TOKEN) {
    return {
      conversations: [],
      errors: ["Token-ul Meta (FACEBOOK_PAGE_ACCESS_TOKEN) nu este setat."],
      fetchedAt: new Date().toISOString(),
    };
  }

  if (!force && !snapshot) {
    const stored = await readStoredSnapshot();
    if (stored && stored.conversations.length > 0) snapshot = { data: stored, at: 0 };
  }

  if (!force && snapshot) {
    if (Date.now() - snapshot.at > FRESH_MS) {
      refreshMeta().catch((error) => console.error("[inbox] refresh failed:", error));
    }
    return snapshot.data;
  }
  return refreshMeta();
}

// ---- WhatsApp, from the webhook's log ----

async function whatsappConversations(): Promise<InboxConversation[]> {
  const latest = await prisma.whatsAppMessage.findMany({
    orderBy: { createdAt: "desc" },
    distinct: ["phone"],
    take: 200,
    include: { patient: { select: { name: true } } },
  });

  return latest.map((m) => ({
    id: `wa:${m.phone}`,
    platform: "whatsapp" as const,
    updatedTime: m.createdAt.toISOString(),
    unreadCount: 0,
    snippet: m.body,
    lastFromPage: m.direction === "out",
    person: { id: m.phone, name: m.patient?.name ?? m.phone, username: null },
    lead: null,
  }));
}

// ---- What the team has read ----
//
// Meta reports "unread" only on Messenger and not reliably there; on Instagram
// not at all. So the team's own opening of a conversation is what counts, kept
// as one small JSON map in InboxState.

const SEEN_KEY = "seen";
const SEEN_MAX = 500;
/** A conversation that went quiet this long ago is not "new" any more. */
const UNREAD_MAX_AGE_MS = 30 * 86_400_000;

async function readSeen(): Promise<Record<string, string>> {
  try {
    const row = await prisma.inboxState.findUnique({ where: { key: SEEN_KEY } });
    return row ? (JSON.parse(row.value) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

/** Marks a conversation read as of `at` (default: now). */
export async function markConversationSeen(
  conversationId: string,
  at: Date = new Date(),
): Promise<void> {
  if (!conversationId) return;
  try {
    const seen = await readSeen();
    seen[conversationId] = at.toISOString();

    // Keep the newest entries only, so the map cannot grow without end.
    const entries = Object.entries(seen)
      .sort((a, b) => Date.parse(b[1]) - Date.parse(a[1]))
      .slice(0, SEEN_MAX);
    const value = JSON.stringify(Object.fromEntries(entries));

    await prisma.inboxState.upsert({
      where: { key: SEEN_KEY },
      create: { key: SEEN_KEY, value },
      update: { value },
    });
  } catch (error) {
    console.warn("markConversationSeen failed:", error);
  }
}

function applySeen(
  conversations: InboxConversation[],
  seen: Record<string, string>,
): InboxConversation[] {
  return conversations.map((c) => {
    const seenAt = seen[c.id] ? Date.parse(seen[c.id]) : 0;
    const updated = Date.parse(c.updatedTime ?? "") || 0;
    const theirTurn = c.lastFromPage !== true;
    const recent = Date.now() - updated <= UNREAD_MAX_AGE_MS;
    const unread =
      theirTurn && recent && updated > seenAt ? Math.max(c.unreadCount, 1) : 0;
    return { ...c, unreadCount: unread };
  });
}

/**
 * Messenger's conversation list says when it last moved, not who moved it.
 * Our own log of the webhook does know, and it is right when its newest row is
 * the message the list is stamped with. Without this, a conversation we have
 * just answered would read as waiting for us.
 */
async function withKnownDirection(
  conversations: InboxConversation[],
): Promise<InboxConversation[]> {
  const ids = conversations
    .filter((c) => c.platform !== "whatsapp" && c.lastFromPage === null && c.person.id)
    .map((c) => c.person.id as string);
  if (ids.length === 0) return conversations;

  const rows = await prisma.socialMessage
    .findMany({
      where: { senderId: { in: ids } },
      orderBy: { createdAt: "desc" },
      distinct: ["channel", "senderId"],
      select: { channel: true, senderId: true, direction: true, createdAt: true },
    })
    .catch(() => []);
  const latest = new Map(rows.map((r) => [`${r.channel}:${r.senderId}`, r]));

  return conversations.map((c) => {
    if (c.platform === "whatsapp" || c.lastFromPage !== null || !c.person.id) return c;
    const row = latest.get(`${c.platform}:${c.person.id}`);
    if (!row) return c;

    const gap = Math.abs((Date.parse(c.updatedTime ?? "") || 0) - row.createdAt.getTime());
    return gap <= 2 * 60_000 ? { ...c, lastFromPage: row.direction === "out" } : c;
  });
}

/**
 * The lead behind each conversation, if there is one — so its status shows in
 * the list and can be changed from the chat. A lead's key is
 * "<platform>:<sender id or number>", the same one the webhooks mint.
 */
async function attachLeads(
  conversations: InboxConversation[],
): Promise<InboxConversation[]> {
  const keys = conversations
    .filter((c) => c.person.id)
    .map((c) => `${c.platform}:${c.person.id}`);
  if (keys.length === 0) return conversations;

  const leads = await prisma.lead
    .findMany({
      where: { sourceKey: { in: keys } },
      select: { id: true, name: true, status: true, sourceKey: true },
    })
    .catch(() => []);
  const byKey = new Map(leads.map((l) => [l.sourceKey, l]));

  return conversations.map((c) => {
    const lead = byKey.get(`${c.platform}:${c.person.id}`);
    if (!lead) return c;
    return {
      ...c,
      lead: { id: lead.id, status: lead.status, name: lead.name },
      // A number with no patient behind it is better labelled by the lead's name.
      person:
        c.platform === "whatsapp" && c.person.name === c.person.id && lead.name
          ? { ...c.person, name: lead.name }
          : c.person,
    };
  });
}

export function summarize(conversations: InboxConversation[]) {
  const day = 86_400_000;
  const now = Date.now();
  let unread = 0;
  let last24h = 0;
  for (const c of conversations) {
    if (c.unreadCount > 0) unread++;
    if (now - (Date.parse(c.updatedTime ?? "") || 0) <= day) last24h++;
  }
  return { total: conversations.length, unread, last24h };
}

// ---- Public API ----

export async function getInbox({ force = false }: { force?: boolean } = {}) {
  const [meta, whatsapp, seen] = await Promise.all([
    metaSnapshot(force),
    whatsappConversations().catch((error) => {
      console.error("[inbox] whatsapp failed:", error);
      return [] as InboxConversation[];
    }),
    readSeen(),
  ]);

  const merged = [...meta.conversations, ...whatsapp].sort(
    (a, b) => Date.parse(b.updatedTime ?? "") - Date.parse(a.updatedTime ?? ""),
  );
  const conversations = await attachLeads(
    applySeen(await withKnownDirection(merged), seen),
  );

  return {
    conversations,
    errors: meta.errors,
    fetchedAt: meta.fetchedAt,
    stats: summarize(conversations),
  };
}

const threadCache = new Map<string, { messages: InboxMessage[]; at: number }>();

export function forgetThread(conversationId: string) {
  threadCache.delete(conversationId);
}

/** One conversation's messages. WhatsApp ids look like "wa:<phone>". */
export async function getThread(conversationId: string): Promise<InboxMessage[]> {
  if (conversationId.startsWith("wa:")) {
    const phone = conversationId.slice(3);
    const rows = await prisma.whatsAppMessage.findMany({
      where: { phone },
      orderBy: { createdAt: "asc" },
      take: 500,
    });
    return rows.map((m) => ({
      id: m.id,
      createdTime: m.createdAt.toISOString(),
      text: m.body,
      fromPage: m.direction === "out",
      fromName: m.direction === "out" ? "noi" : phone,
    }));
  }

  const cached = threadCache.get(conversationId);
  if (cached && Date.now() - cached.at < THREAD_FRESH_MS) return cached.messages;

  const messages = await fetchMessages(conversationId);
  threadCache.set(conversationId, { messages, at: Date.now() });
  return messages;
}

/**
 * The conversation with one person, for a link that arrives knowing only who —
 * a lead's "see the conversation". Looked up in what is already loaded, then
 * asked of Meta by user id, since an old conversation falls off the list.
 */
export async function findConversation(
  platform: InboxPlatform,
  personId: string,
): Promise<InboxConversation | null> {
  const inbox = await getInbox();
  const known = inbox.conversations.find(
    (c) => c.platform === platform && c.person.id === personId,
  );
  if (known) return known;

  if (platform === "whatsapp") {
    const last = await prisma.whatsAppMessage.findFirst({
      where: { phone: personId },
      orderBy: { createdAt: "desc" },
    });
    if (!last) return null;
    const [conversation] = await attachLeads([
      {
        id: `wa:${personId}`,
        platform: "whatsapp",
        updatedTime: last.createdAt.toISOString(),
        unreadCount: 0,
        snippet: last.body,
        lastFromPage: last.direction === "out",
        person: { id: personId, name: personId, username: null },
        lead: null,
      },
    ]);
    return conversation;
  }

  if (!PAGE_TOKEN) return null;
  try {
    const res = await graph<{ data?: RawConversation[] }>(`${PAGE}/conversations`, {
      platform,
      user_id: personId,
      fields: CONVERSATION_FIELDS[platform],
    });
    const first = res.data?.[0];
    if (!first) return null;
    const [conversation] = await attachLeads(
      applySeen([toConversation(first, platform)], await readSeen()),
    );
    return conversation;
  } catch {
    return null;
  }
}

/**
 * Why the conversations do not arrive, asked of Meta point by point. Read-only:
 * it changes nothing on the Page.
 */
export async function diagnose() {
  const [page, subscribed, messenger, instagram] = await Promise.allSettled([
    graph<{ name?: string; instagram_business_account?: { id: string; username?: string } }>(
      PAGE,
      { fields: "name,instagram_business_account{id,username}" },
    ),
    graph<{ data?: { subscribed_fields?: string[] }[] }>(`${PAGE}/subscribed_apps`, {
      fields: "subscribed_fields",
    }),
    fetchConversations("messenger", 3),
    fetchConversations("instagram", 3),
  ]);

  const subscribedFields =
    subscribed.status === "fulfilled"
      ? (subscribed.value.data ?? []).flatMap((a) => a.subscribed_fields ?? [])
      : null;

  const outcome = (r: PromiseSettledResult<InboxConversation[]>) =>
    r.status === "fulfilled"
      ? { ok: true, count: r.value.length }
      : { ok: false, error: (r.reason as Error)?.message ?? "Eroare" };

  return {
    page:
      page.status === "fulfilled"
        ? { name: page.value.name ?? null }
        : { error: (page.reason as Error)?.message ?? "Eroare" },
    instagram:
      page.status === "fulfilled" && page.value.instagram_business_account
        ? { username: page.value.instagram_business_account.username ?? null }
        : null,
    subscribedFields,
    hasMessages: subscribedFields?.includes("messages") ?? null,
    platforms: { messenger: outcome(messenger), instagram: outcome(instagram) },
  };
}
