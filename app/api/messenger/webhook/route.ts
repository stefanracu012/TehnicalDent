// =============================================
// Messenger (Facebook Page) + Instagram DM webhook — Meta Webhooks for
// Messenger Platform. Once the Instagram Professional account is linked to
// the Page, its DMs arrive through this same endpoint (object: "instagram").
//
// Setup (once, in Meta App Dashboard):
//   Messenger -> Settings -> Webhooks:
//     Callback URL:  https://<your-site>/api/messenger/webhook
//     Verify token:  value of MESSENGER_VERIFY_TOKEN env var
//     Subscribe to:  messages
//   Then connect the Page (and linked Instagram account) to this App and
//   generate a Page Access Token — needed later for sending replies.
//
// Currently: verifies the handshake, logs/forwards incoming messages to the
// admin Telegram "Mesaje clienți" topic. No auto-reply yet — that's a
// follow-up once the AI reply layer is built (shared with WhatsApp).
// =============================================

import crypto from "crypto";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendTelegramToTopic, TELEGRAM_TOPICS } from "@/lib/telegram";
import { captureLead } from "@/lib/leads";
import type { SocialChannel } from "@prisma/client";

const VERIFY_TOKEN = process.env.MESSENGER_VERIFY_TOKEN || "";
// Same Meta App as WhatsApp, so the App Secret used to verify
// X-Hub-Signature-256 is the same value.
const APP_SECRET = process.env.WHATSAPP_APP_SECRET || "";
const PAGE_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN || "";

interface MessagingEvent {
  sender: { id: string };
  recipient: { id: string };
  timestamp: number;
  message?: {
    mid: string;
    text?: string;
    attachments?: { type: string }[];
    is_echo?: boolean;
  };
  postback?: { title: string; payload: string };
}

interface WebhookEntry {
  id: string;
  time: number;
  messaging?: MessagingEvent[];
}

interface WebhookBody {
  object?: "page" | "instagram" | string;
  entry?: WebhookEntry[];
}

/**
 * Whether a webhook entry is for one of this clinic's own assets.
 *
 * Meta delivers events for every page and Instagram account the app is
 * subscribed to, and the payload names the asset in entry.id. Without both ids
 * configured this cannot be judged, so everything is accepted — the same
 * behaviour as before, rather than a silent blackout of the inbox.
 */
function belongsToClinic(entryId: string): boolean {
  const owned = [
    process.env.FACEBOOK_PAGE_ID,
    process.env.INSTAGRAM_USER_ID,
  ].filter(Boolean);
  if (owned.length === 0) return true;
  return owned.includes(entryId);
}

function eventText(m: MessagingEvent): string {
  if (m.message?.text) return m.message.text;
  if (m.message?.attachments?.length) return `[${m.message.attachments[0].type}]`;
  if (m.postback) return m.postback.title;
  return "[mesaj necunoscut]";
}

// Looks up the sender's display name once per conversation. Reuses whatever
// was stored on an earlier message instead of calling the Graph API on every
// inbound message.
async function resolveSenderName(
  channel: SocialChannel,
  senderId: string,
): Promise<string | null> {
  const known = await prisma.socialMessage.findFirst({
    where: { channel, senderId, senderName: { not: null } },
    select: { senderName: true },
  });
  if (known?.senderName) return known.senderName;
  if (!PAGE_TOKEN) {
    console.warn("resolveSenderName: FACEBOOK_PAGE_ACCESS_TOKEN is not set");
    return null;
  }

  // Instagram profiles expose a handle too, and it's often the only thing
  // set; asking for "username" on a Messenger PSID would fail the request,
  // so the field list is per channel.
  const fields = channel === "instagram" ? "name,username" : "name";

  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${senderId}?fields=${fields}&access_token=${PAGE_TOKEN}`,
    );
    if (!res.ok) {
      // Until Business Asset User Profile Access is granted, this returns a
      // permission error for anyone without a role on the app — logged so
      // the cause is visible instead of silently showing raw ids.
      const detail = await res.text().catch(() => "");
      console.warn(
        `resolveSenderName ${channel} ${res.status}: ${detail.slice(0, 300)}`,
      );
      return null;
    }
    const data = (await res.json()) as { name?: string; username?: string };
    const name = data.name || data.username || null;

    // Name arriving late (permission just granted, or first successful call)
    // retro-labels the whole conversation, not just messages from here on.
    if (name) {
      await prisma.socialMessage.updateMany({
        where: { channel, senderId, senderName: null },
        data: { senderName: name },
      });
    }
    return name;
  } catch (error) {
    console.warn(`resolveSenderName ${channel} failed:`, error);
    return null;
  }
}

// ---------- GET: Meta subscription verification handshake ----------

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (!VERIFY_TOKEN || mode !== "subscribe" || token !== VERIFY_TOKEN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return new NextResponse(challenge ?? "", { status: 200 });
}

// ---------- POST: incoming Messenger/Instagram messages ----------

export async function POST(request: Request) {
  const rawBody = await request.text();

  if (APP_SECRET) {
    const signature = request.headers.get("x-hub-signature-256") || "";
    const expected =
      "sha256=" +
      crypto.createHmac("sha256", APP_SECRET).update(rawBody).digest("hex");
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expected);
    const valid =
      sigBuf.length === expBuf.length &&
      crypto.timingSafeEqual(sigBuf, expBuf);
    if (!valid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }
  }

  let body: WebhookBody;
  try {
    body = JSON.parse(rawBody) as WebhookBody;
  } catch {
    return NextResponse.json({ ok: true });
  }

  const channel = body.object === "instagram" ? "instagram" : "messenger";
  const source = channel === "instagram" ? "Instagram" : "Messenger";

  for (const entry of body.entry || []) {
    // entry.id is the Page (or Instagram account) the event belongs to. The app
    // receives events for every asset it is subscribed to, so without this the
    // clinic's inbox fills with conversations from unrelated pages — and
    // Telegram announces every one of them.
    if (!belongsToClinic(entry.id)) {
      console.warn(
        `Webhook ignored: ${channel} entry ${entry.id} is not this clinic's page`,
      );
      continue;
    }

    for (const event of entry.messaging || []) {
      // Echo of our own outbound message, sent back by Instagram with the
      // Page as "sender" — not a real inbound message from a patient.
      if (event.message?.is_echo) continue;

      // Meta retries webhook delivery on failure — skip anything already stored.
      if (event.message?.mid) {
        const seen = await prisma.socialMessage.findFirst({
          where: { metaMessageId: event.message.mid },
          select: { id: true },
        });
        if (seen) continue;
      }

      const text = eventText(event);
      const senderName = await resolveSenderName(channel, event.sender.id);

      await prisma.socialMessage.create({
        data: {
          channel,
          senderId: event.sender.id,
          senderName,
          direction: "in",
          body: text,
          metaMessageId: event.message?.mid,
          pageId: entry.id,
        },
      });

      await captureLead({
        source: channel,
        reference: event.sender.id,
        name: senderName,
        message: text,
      });

      await sendTelegramToTopic(
        `💬 <b>Mesaj ${source}</b> de la <code>${senderName || event.sender.id}</code>\n${text}`,
        TELEGRAM_TOPICS.mesaje,
      );
    }
  }

  return NextResponse.json({ ok: true });
}
