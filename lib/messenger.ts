// =============================================
// Sending replies over Messenger and Instagram DM (Meta Send API).
//
// Both channels go through the same Page-scoped endpoint and the same Page
// Access Token — Instagram DMs are delivered via the linked Facebook Page,
// which is why there's no separate Instagram token here.
// =============================================

import prisma from "@/lib/prisma";
import type { SocialChannel } from "@prisma/client";

const PAGE_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN || "";
const GRAPH = "https://graph.facebook.com/v21.0";

/**
 * Meta closes the free-form reply window 24h after the customer's last
 * message. Past that, a reply must be tagged — HUMAN_AGENT covers a real
 * staff member answering later (clinic closed for the weekend, inquiry that
 * needed a dentist to look into it), and is valid for 7 days.
 */
const HUMAN_AGENT_WINDOW = 24 * 60 * 60_000;

export function isMessengerConfigured(): boolean {
  return Boolean(PAGE_TOKEN);
}

/** Time of the last inbound message from this person, or null if none. */
async function lastInboundAt(channel: SocialChannel, senderId: string): Promise<Date | null> {
  const last = await prisma.socialMessage.findFirst({
    where: { channel, senderId, direction: "in" },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  return last?.createdAt ?? null;
}

/**
 * Sends a reply and records it. Picks the message tag automatically: inside
 * the 24h window the reply needs none, outside it we send as HUMAN_AGENT,
 * which is only correct because these replies are typed by clinic staff in
 * the admin inbox — never generated automatically.
 */
/**
 * Looks one sender up in the Page's conversation list.
 *
 * Cheaper than the full sync and aimed at the webhook: whoever just wrote sits
 * at the top of that list, because it comes back ordered by most recent
 * activity. One page is almost always enough.
 *
 * Returns null rather than throwing — a missing name must never cost the
 * message that triggered the lookup.
 */
export async function findNameInConversations(
  channel: SocialChannel,
  senderId: string,
): Promise<string | null> {
  if (!isMessengerConfigured()) return null;

  // Instagram refuses this edge at any page size above one.
  const limit = channel === "instagram" ? 1 : 100;

  try {
    const url =
      `${GRAPH}/me/conversations?platform=${channel}` +
      `&fields=participants&limit=${limit}` +
      `&access_token=${encodeURIComponent(PAGE_TOKEN)}`;

    const body = (await (await fetch(url)).json()) as {
      data?: { participants?: { data?: { id: string; name?: string; username?: string }[] } }[];
      error?: { message: string };
    };
    if (body.error) {
      console.warn(`findNameInConversations ${channel}: ${body.error.message}`);
      return null;
    }

    for (const conversation of body.data ?? []) {
      for (const person of conversation.participants?.data ?? []) {
        if (person.id === senderId) return person.name || person.username || null;
      }
    }
  } catch (error) {
    console.warn(`findNameInConversations ${channel} failed:`, error);
  }
  return null;
}

/**
 * Fills in sender names from the Page's own conversation list.
 *
 * Looking a PSID up directly (`GET /{psid}`) needs Business Asset User Profile
 * Access, which is still in review — that is why the inbox shows raw ids. But
 * the Page's conversation list carries participant names already, needs only
 * the messaging scopes we hold, and answers the same question for everyone at
 * once instead of one person at a time.
 *
 * Never throws: names are a nicety, and the inbox must open without them.
 */
export async function syncSenderNames(): Promise<number> {
  if (!isMessengerConfigured()) return 0;

  const pageId = process.env.FACEBOOK_PAGE_ID || "";
  const igId = process.env.INSTAGRAM_USER_ID || "";
  const ours = new Set([pageId, igId].filter(Boolean));

  // Instagram refuses anything but a tiny page size on this edge, so the two
  // platforms are walked with different budgets rather than one shared setting.
  const plans: { channel: SocialChannel; limit: number; pages: number }[] = [
    { channel: "messenger", limit: 100, pages: 3 },
    { channel: "instagram", limit: 1, pages: 10 },
  ];

  let updated = 0;

  for (const plan of plans) {
    let url =
      `${GRAPH}/me/conversations?platform=${plan.channel}` +
      `&fields=participants&limit=${plan.limit}` +
      `&access_token=${encodeURIComponent(PAGE_TOKEN)}`;

    for (let page = 0; page < plan.pages && url; page++) {
      let body: {
        data?: { participants?: { data?: { id: string; name?: string; username?: string }[] } }[];
        paging?: { next?: string };
        error?: { message: string };
      };
      try {
        body = await (await fetch(url)).json();
      } catch {
        break;
      }
      if (body.error) {
        console.warn(`syncSenderNames ${plan.channel}: ${body.error.message}`);
        break;
      }

      for (const conversation of body.data ?? []) {
        for (const person of conversation.participants?.data ?? []) {
          const name = person.name || person.username;
          if (!name || ours.has(person.id)) continue;

          // Only fills gaps. A name typed by reception is a better label than
          // a Facebook nickname, so it is never overwritten.
          const { count } = await prisma.socialMessage.updateMany({
            where: { channel: plan.channel, senderId: person.id, senderName: null },
            data: { senderName: name },
          });
          updated += count;
        }
      }

      url = body.paging?.next ?? "";
    }
  }

  return updated;
}

export async function sendSocialReply(
  channel: SocialChannel,
  senderId: string,
  text: string,
): Promise<void> {
  if (!isMessengerConfigured()) {
    throw new Error("Messenger not configured (FACEBOOK_PAGE_ACCESS_TOKEN)");
  }

  const last = await lastInboundAt(channel, senderId);
  const outsideWindow = !last || Date.now() - last.getTime() > HUMAN_AGENT_WINDOW;

  const body: Record<string, unknown> = {
    recipient: { id: senderId },
    message: { text },
    messaging_type: outsideWindow ? "MESSAGE_TAG" : "RESPONSE",
    ...(outsideWindow ? { tag: "HUMAN_AGENT" } : {}),
  };

  const res = await fetch(`${GRAPH}/me/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${PAGE_TOKEN}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Send API ${res.status}: ${err.slice(0, 300)}`);
  }

  // Carry the name we already know onto the outbound row. Without this the
  // reply becomes the newest message for this sender with a null name, and
  // the conversation list falls back to showing the raw PSID/IGSID.
  const known = await prisma.socialMessage.findFirst({
    where: { channel, senderId, senderName: { not: null } },
    select: { senderName: true },
  });

  await prisma.socialMessage.create({
    data: {
      channel,
      senderId,
      senderName: known?.senderName ?? null,
      direction: "out",
      body: text,
    },
  });
}
