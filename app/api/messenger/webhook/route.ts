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

const VERIFY_TOKEN = process.env.MESSENGER_VERIFY_TOKEN || "";
// Same Meta App as WhatsApp, so the App Secret used to verify
// X-Hub-Signature-256 is the same value.
const APP_SECRET = process.env.WHATSAPP_APP_SECRET || "";

interface MessagingEvent {
  sender: { id: string };
  recipient: { id: string };
  timestamp: number;
  message?: { mid: string; text?: string; attachments?: { type: string }[] };
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

function eventText(m: MessagingEvent): string {
  if (m.message?.text) return m.message.text;
  if (m.message?.attachments?.length) return `[${m.message.attachments[0].type}]`;
  if (m.postback) return m.postback.title;
  return "[mesaj necunoscut]";
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
    for (const event of entry.messaging || []) {
      // Meta retries webhook delivery on failure — skip anything already stored.
      if (event.message?.mid) {
        const seen = await prisma.socialMessage.findFirst({
          where: { metaMessageId: event.message.mid },
          select: { id: true },
        });
        if (seen) continue;
      }

      const text = eventText(event);

      await prisma.socialMessage.create({
        data: {
          channel,
          senderId: event.sender.id,
          direction: "in",
          body: text,
          metaMessageId: event.message?.mid,
        },
      });

      await sendTelegramToTopic(
        `💬 <b>Mesaj ${source}</b> de la <code>${event.sender.id}</code>\n${text}`,
        TELEGRAM_TOPICS.mesaje,
      );
    }
  }

  return NextResponse.json({ ok: true });
}
