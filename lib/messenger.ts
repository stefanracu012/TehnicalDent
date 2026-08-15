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
