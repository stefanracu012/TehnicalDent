"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { secureFetch } from "@/lib/csrf-client";
import { getStatus } from "@/lib/leads-config";
import PlatformIcon, { PLATFORM_LABEL } from "@/components/admin/PlatformIcon";
import ConversationLeadControl from "@/components/admin/ConversationLeadControl";
import type { InboxConversation, InboxMessage, InboxPlatform } from "@/lib/inbox";

/**
 * Messenger, Instagram and WhatsApp in one list.
 *
 * There is no refresh button: the list refreshes itself in the background and
 * whenever the window regains focus. Old data stays on screen while the new
 * arrives, so the page does not flash.
 */

interface InboxData {
  conversations: InboxConversation[];
  errors: string[];
  stats: { total: number; unread: number; last24h: number };
}

interface Diagnosis {
  page: { name?: string | null; error?: string };
  instagram: { username: string | null } | null;
  hasMessages: boolean | null;
  platforms: Record<string, { ok: boolean; count?: number; error?: string }>;
}

const TABS = [
  { value: "unread", label: "Necitite" },
  { value: "all", label: "Toate" },
  { value: "recent", label: "Recente" },
] as const;

const PLATFORM_FILTERS: { value: "" | InboxPlatform; label: string }[] = [
  { value: "", label: "Toate" },
  { value: "messenger", label: "Messenger" },
  { value: "instagram", label: "Instagram" },
  { value: "whatsapp", label: "WhatsApp" },
];

const POLL_MS = 25_000;
const HOUR = 3_600_000;

const AVATAR_TONE: Record<InboxPlatform, string> = {
  messenger: "bg-blue-50 text-blue-700",
  instagram: "bg-pink-50 text-pink-700",
  whatsapp: "bg-green-50 text-green-700",
};

const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || "?";

const timeLabel = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  const minutes = Math.round((Date.now() - d.getTime()) / 60_000);
  if (minutes < 1) return "acum";
  if (minutes < 60) return `${minutes} min`;
  if (minutes < 24 * 60) {
    return d.toLocaleTimeString("ro-RO", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Chisinau",
    });
  }
  return d.toLocaleDateString("ro-RO", {
    day: "2-digit",
    month: "short",
    timeZone: "Europe/Chisinau",
  });
};

const fullTime = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString("ro-RO", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Europe/Chisinau",
      })
    : "";

function Avatar({ name, platform }: { name: string; platform: InboxPlatform }) {
  return (
    <div className="relative shrink-0">
      <div
        className={`h-10 w-10 rounded-full flex items-center justify-center text-xs font-semibold ${AVATAR_TONE[platform]}`}
      >
        {initials(name)}
      </div>
      <span
        title={PLATFORM_LABEL[platform]}
        className="absolute -bottom-0.5 -right-0.5 h-[18px] w-[18px] rounded-full bg-white ring-2 ring-background flex items-center justify-center"
      >
        <PlatformIcon platform={platform} className="h-3 w-3" />
      </span>
    </div>
  );
}

export default function AdminMessagesPage() {
  // useSearchParams needs a Suspense boundary above it.
  return (
    <Suspense>
      <Inbox />
    </Suspense>
  );
}

function Inbox() {
  const search = useSearchParams();
  const deepPlatform = search.get("platform") as InboxPlatform | null;
  const deepPerson = search.get("person");

  const [data, setData] = useState<InboxData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [tab, setTab] = useState<(typeof TABS)[number]["value"]>("all");
  const [platform, setPlatform] = useState<"" | InboxPlatform>("");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<InboxConversation | null>(null);
  const [threads, setThreads] = useState<Record<string, InboxMessage[]>>({});
  const [threadLoading, setThreadLoading] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null);
  const [checking, setChecking] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const hasData = useRef(false);

  const load = useCallback(async (silent = false) => {
    if (!silent && !hasData.current) setLoading(true);
    try {
      const res = await secureFetch("/api/admin/messages");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Nu am putut citi mesajele.");
      setData(json);
      hasData.current = true;
      setError(null);
    } catch (e) {
      // A refresh that fails quietly keeps what is on screen.
      if (!silent) setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const timer = setInterval(() => load(true), POLL_MS);
    const onFocus = () => load(true);
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [load]);

  const openThread = useCallback(
    async (conversation: InboxConversation) => {
      setSelected({ ...conversation, unreadCount: 0 });
      setDraft("");
      setSendError(null);

      // The badge goes out at once, without waiting for the server.
      setData((prev) =>
        prev && {
          ...prev,
          conversations: prev.conversations.map((c) =>
            c.id === conversation.id ? { ...c, unreadCount: 0 } : c,
          ),
          stats: {
            ...prev.stats,
            unread: Math.max(0, prev.stats.unread - (conversation.unreadCount > 0 ? 1 : 0)),
          },
        },
      );

      setThreadLoading(!threads[conversation.id]);
      try {
        const res = await secureFetch(
          `/api/admin/messages?conversation=${encodeURIComponent(conversation.id)}`,
        );
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Nu am putut citi conversația.");
        setThreads((prev) => ({ ...prev, [conversation.id]: json.messages ?? [] }));
      } catch (e) {
        setSendError((e as Error).message);
      } finally {
        setThreadLoading(false);
      }
    },
    [threads],
  );

  // Arriving from a lead: open that person's conversation, once.
  const opened = useRef(false);
  useEffect(() => {
    if (opened.current || loading || !deepPlatform || !deepPerson) return;
    opened.current = true;

    const known = data?.conversations.find(
      (c) => c.platform === deepPlatform && c.person.id === deepPerson,
    );
    if (known) {
      openThread(known);
      return;
    }
    // An old conversation can sit past what the list holds — ask for it.
    secureFetch(
      `/api/admin/messages?platform=${deepPlatform}&person=${encodeURIComponent(deepPerson)}`,
    )
      .then((r) => r.json())
      .then((j) => j.conversation && openThread(j.conversation))
      .catch(() => {});
  }, [loading, data, deepPlatform, deepPerson, openThread]);

  const thread = selected ? (threads[selected.id] ?? []) : [];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [thread.length, selected?.id]);

  // How long since the person last wrote decides what a reply may look like.
  const lastFromPerson = [...thread].reverse().find((m) => !m.fromPage);
  const sinceLast = lastFromPerson?.createdTime
    ? Date.now() - new Date(lastFromPerson.createdTime).getTime()
    : null;
  const isMeta = selected && selected.platform !== "whatsapp";
  const notice =
    sinceLast == null || !selected
      ? null
      : isMeta && sinceLast > 7 * 24 * HOUR
        ? "Au trecut peste 7 zile de la ultimul mesaj al persoanei — Meta nu mai permite niciun răspuns."
        : isMeta && sinceLast > 24 * HOUR
          ? "Peste 24 de ore: mesajul pleacă marcat ca răspuns de agent uman (permis 7 zile)."
          : !isMeta && sinceLast > 24 * HOUR
            ? "Peste 24 de ore de la ultimul mesaj al pacientului, WhatsApp nu mai primește text liber — trimiterea poate eșua."
            : null;

  const send = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = draft.trim();
    if (!text || !selected?.person.id) return;

    setSending(true);
    setSendError(null);
    try {
      const res = await secureFetch("/api/admin/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: selected.platform,
          recipientId: selected.person.id,
          text,
          conversationId: selected.id,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Mesajul nu a putut fi trimis.");

      const sentAt = json.sentAt ?? new Date().toISOString();
      setThreads((prev) => ({
        ...prev,
        [selected.id]: [
          ...(prev[selected.id] ?? []),
          { id: `local-${Date.now()}`, createdTime: sentAt, text, fromPage: true, fromName: "noi" },
        ],
      }));
      setDraft("");
      setData((prev) =>
        prev && {
          ...prev,
          conversations: prev.conversations.map((c) =>
            c.id === selected.id
              ? { ...c, snippet: text, updatedTime: sentAt, lastFromPage: true, unreadCount: 0 }
              : c,
          ),
        },
      );
    } catch (err) {
      setSendError((err as Error).message);
    } finally {
      setSending(false);
    }
  };

  const updateLead = (conversationId: string, lead: InboxConversation["lead"]) => {
    setSelected((prev) => (prev?.id === conversationId ? { ...prev, lead } : prev));
    setData((prev) =>
      prev && {
        ...prev,
        conversations: prev.conversations.map((c) =>
          c.id === conversationId ? { ...c, lead } : c,
        ),
      },
    );
  };

  const conversations = useMemo(() => {
    let list = data?.conversations ?? [];
    if (platform) list = list.filter((c) => c.platform === platform);
    if (tab === "unread") list = list.filter((c) => c.unreadCount > 0);
    else if (tab === "recent") {
      list = list.filter((c) => Date.now() - Date.parse(c.updatedTime ?? "") <= 24 * HOUR);
    }
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (c) =>
          c.person.name.toLowerCase().includes(q) ||
          (c.person.username ?? "").toLowerCase().includes(q) ||
          c.snippet.toLowerCase().includes(q) ||
          (c.person.id ?? "").includes(q),
      );
    }
    return list;
  }, [data, tab, platform, query]);

  const runCheck = async () => {
    setChecking(true);
    try {
      const res = await secureFetch("/api/admin/messages?diagnose=1");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Eroare");
      setDiagnosis(json);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setChecking(false);
    }
  };

  const unread = data?.stats.unread ?? 0;

  return (
    <div className="min-h-full bg-gray-50">
      <div className="p-3 sm:p-4 lg:p-5">
        <div className="mb-5">
          <h1 className="text-xl font-bold text-gray-900">Mesaje</h1>
          <p className="mt-1 text-sm text-gray-500">
            Messenger, Instagram și WhatsApp, într-un singur loc.
            {unread > 0 && (
              <span className="ml-2 font-semibold text-gray-900">
                {unread} {unread === 1 ? "necitită" : "necitite"}
              </span>
            )}
          </p>
        </div>

        {error &&
          (data ? (
            <p className="mb-3 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Meta răspunde greu — vezi ultimele date cunoscute. Se reîncearcă singur.
            </p>
          ) : (
            <div className="mb-4 border border-red-200 bg-red-50 text-red-700 rounded-lg px-4 py-3 text-sm">
              {error}
            </div>
          ))}

        {data && data.errors.length > 0 && (
          <p className="mb-3 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            {data.errors.join(" · ")}
          </p>
        )}

        <div className="grid lg:grid-cols-[24rem_1fr] gap-4 items-start">
          {/* The list */}
          <div
            className={`bg-white rounded-xl border border-gray-200 overflow-hidden ${selected ? "hidden lg:block" : ""}`}
          >
            <div className="px-3 pt-3 space-y-3">
              <div className="flex border-b border-gray-100">
                {TABS.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setTab(t.value)}
                    className={`flex-1 lg:flex-none px-3 py-2 text-xs font-semibold border-b-2 -mb-px transition-colors ${
                      tab === t.value
                        ? "border-indigo-400 text-gray-900"
                        : "border-transparent text-gray-500 hover:text-gray-900"
                    }`}
                  >
                    {t.label}
                    {t.value === "unread" && unread > 0 && (
                      <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-indigo-600 text-white text-[10px]">
                        {unread}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap gap-1.5">
                {PLATFORM_FILTERS.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => setPlatform(p.value)}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-full transition-colors ${
                      platform === p.value
                        ? "bg-indigo-600 text-white"
                        : "border border-gray-200 rounded-lg text-gray-500 hover:text-gray-900"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Caută după nume sau text…"
                className="w-full border border-gray-300 rounded-lg bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none mb-3"
              />
            </div>

            {loading && !data ? (
              <p className="p-5 text-sm text-gray-500">Se încarcă…</p>
            ) : conversations.length === 0 ? (
              <div className="p-5 text-sm text-gray-500 text-center space-y-3">
                <p>
                  {query
                    ? "Nicio conversație care să se potrivească."
                    : tab === "unread"
                      ? "Nicio conversație necitită. 🎉"
                      : "Nicio conversație încă."}
                </p>
                {!query && tab !== "unread" && (
                  <div className="text-left space-y-2">
                    <button
                      onClick={runCheck}
                      disabled={checking}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs font-semibold hover:border-indigo-400 disabled:opacity-60"
                    >
                      {checking ? "Se verifică…" : "🔎 Verifică conexiunea cu Meta"}
                    </button>
                    {diagnosis && (
                      <div className="text-xs bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-1 text-gray-900">
                        <p>
                          <b>Pagina:</b> {diagnosis.page.name || diagnosis.page.error || "—"}
                        </p>
                        <p>
                          <b>Instagram:</b>{" "}
                          {diagnosis.instagram
                            ? `@${diagnosis.instagram.username}`
                            : "niciun cont legat"}
                        </p>
                        <p>
                          <b>Abonat la mesaje:</b>{" "}
                          {diagnosis.hasMessages == null
                            ? "nu s-a putut verifica"
                            : diagnosis.hasMessages
                              ? "da"
                              : "nu"}
                        </p>
                        {(["messenger", "instagram"] as const).map((p) => (
                          <p key={p}>
                            <b>{PLATFORM_LABEL[p]}:</b>{" "}
                            {diagnosis.platforms[p]?.ok
                              ? `${diagnosis.platforms[p].count} conversații`
                              : diagnosis.platforms[p]?.error || "eroare"}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <ul className="divide-y divide-gray-100 max-h-[calc(100vh-18rem)] lg:max-h-[68vh] overflow-y-auto border-t border-gray-100">
                {conversations.map((c) => {
                  const active = selected?.id === c.id;
                  const isUnread = c.unreadCount > 0;
                  return (
                    <li key={c.id}>
                      <button
                        onClick={() => openThread(c)}
                        className={`w-full text-left px-3 py-3 flex gap-3 transition-colors ${
                          active ? "bg-indigo-50" : "hover:bg-gray-50"
                        }`}
                      >
                        <Avatar name={c.person.name} platform={c.platform} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={`text-sm truncate ${
                                isUnread ? "font-bold text-gray-900" : "font-medium text-gray-900"
                              }`}
                            >
                              {c.person.name}
                              {c.lead && (
                                <span
                                  className={`ml-1.5 px-1.5 py-0.5 rounded border text-[9px] font-semibold align-middle ${getStatus(c.lead.status).className}`}
                                >
                                  {getStatus(c.lead.status).label}
                                </span>
                              )}
                            </span>
                            <span
                              className={`text-[11px] whitespace-nowrap ${
                                isUnread ? "text-gray-900 font-semibold" : "text-gray-500"
                              }`}
                            >
                              {timeLabel(c.updatedTime)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2 mt-0.5">
                            <p
                              className={`text-xs truncate ${
                                isUnread ? "text-gray-900 font-medium" : "text-gray-500"
                              }`}
                            >
                              {c.lastFromPage && c.snippet && (
                                <span className="text-gray-500">Tu: </span>
                              )}
                              {c.snippet || <span className="opacity-50">fără text</span>}
                            </p>
                            {isUnread && (
                              <span className="shrink-0 px-1.5 h-[18px] rounded-full bg-indigo-600 text-white text-[10px] font-semibold flex items-center">
                                Nou
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* The thread */}
          <div
            className={`bg-white rounded-xl border border-gray-200 min-h-[26rem] flex-col ${
              selected ? "flex" : "hidden lg:flex"
            }`}
          >
            {!selected ? (
              <div className="flex-1 flex items-center justify-center text-center p-10 text-sm text-gray-500">
                Alege o conversație din stânga.
              </div>
            ) : (
              <>
                <div className="px-4 py-3 border-b border-gray-100 flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => setSelected(null)}
                    className="lg:hidden text-sm text-gray-500 hover:text-gray-900"
                    aria-label="Înapoi la inbox"
                  >
                    ←
                  </button>
                  <Avatar name={selected.person.name} platform={selected.platform} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900 truncate">{selected.person.name}</p>
                    <p className="text-xs text-gray-500">
                      {PLATFORM_LABEL[selected.platform]}
                      {selected.person.username ? ` · @${selected.person.username}` : ""}
                      {selected.platform === "whatsapp" && selected.person.id
                        ? ` · ${selected.person.id}`
                        : ""}
                      {selected.updatedTime ? ` · ${fullTime(selected.updatedTime)}` : ""}
                    </p>
                  </div>
                  <ConversationLeadControl
                    conversation={selected}
                    onChange={(lead) => updateLead(selected.id, lead)}
                  />
                </div>

                {threadLoading ? (
                  <p className="flex-1 p-8 text-sm text-gray-500 text-center">
                    Se încarcă…
                  </p>
                ) : thread.length === 0 ? (
                  <p className="flex-1 p-8 text-sm text-gray-500 text-center">
                    Fără mesaje de afișat.
                  </p>
                ) : (
                  <div className="flex-1 p-4 space-y-2 max-h-[calc(100vh-24rem)] min-h-[45vh] lg:max-h-[56vh] overflow-y-auto">
                    {thread.map((m) => (
                      <div key={m.id} className={`flex ${m.fromPage ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[85%] lg:max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                            m.fromPage ? "bg-indigo-600 text-white rounded-br-sm" : "bg-gray-100 text-gray-900 rounded-bl-sm"
                          }`}
                        >
                          {m.text ? (
                            <p className="whitespace-pre-wrap break-words">{m.text}</p>
                          ) : (
                            <p className="italic opacity-70">(atașament)</p>
                          )}
                          <p
                            className={`text-[10px] mt-1 ${
                              m.fromPage ? "text-indigo-100" : "text-gray-500"
                            }`}
                          >
                            {fullTime(m.createdTime)}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div ref={bottomRef} />
                  </div>
                )}

                <form onSubmit={send} className="border-t border-gray-100 p-3 space-y-2">
                  {notice && (
                    <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      {notice}
                    </p>
                  )}
                  {sendError && (
                    <p className="text-[11px] text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                      {sendError}
                    </p>
                  )}
                  <div className="flex items-end gap-2">
                    <textarea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          send();
                        }
                      }}
                      rows={2}
                      placeholder="Scrie un mesaj… (Enter trimite)"
                      className="flex-1 border border-gray-300 rounded-lg bg-white px-3 py-2 text-sm resize-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={sending || !draft.trim()}
                      className="inline-flex items-center rounded-lg bg-indigo-600 text-white text-sm font-medium px-4 py-2 hover:bg-indigo-700 transition-colors disabled:opacity-50"
                    >
                      {sending ? "…" : "Trimite"}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
