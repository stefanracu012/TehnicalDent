// =============================================
// WhatsApp Business Cloud API (Meta) webhook
// Receives incoming messages/status updates and
// handles the Meta subscription verification handshake.
//
// Setup (once, in Meta App Dashboard -> WhatsApp -> Configuration):
//   Callback URL:  https://<your-site>/api/whatsapp/webhook
//   Verify token:  value of WHATSAPP_VERIFY_TOKEN env var
//   Subscribe to:  messages
//
// Env vars used:
//   WHATSAPP_VERIFY_TOKEN  - shared secret Meta echoes back during setup
//   WHATSAPP_APP_SECRET    - app secret, used to verify X-Hub-Signature-256
//                            on incoming POSTs (optional but recommended)
//   TELEGRAM_BOT_TOKEN / TELEGRAM_ADMIN_CHAT_ID (or TELEGRAM_CHAT_ID)
//                          - where incoming patient replies get forwarded
// =============================================

import crypto from "crypto";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { normalizePhone } from "@/lib/appointments";

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || "";
const APP_SECRET = process.env.WHATSAPP_APP_SECRET || "";
const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const TG_CHAT_ID =
  process.env.TELEGRAM_ADMIN_CHAT_ID || process.env.TELEGRAM_CHAT_ID || "";

async function notifyAdmin(text: string) {
  if (!TG_TOKEN || !TG_CHAT_ID) return;
  await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: TG_CHAT_ID, text, parse_mode: "HTML" }),
  }).catch(() => {});
}

// ---------- Meta webhook payload shapes (subset we care about) ----------

interface WaMessage {
  from: string; // sender wa_id, digits only, no leading '+'
  id: string;
  timestamp: string;
  type: string;
  text?: { body: string };
  button?: { text: string; payload: string };
  interactive?: {
    button_reply?: { id: string; title: string };
    list_reply?: { id: string; title: string };
  };
}

interface WaStatus {
  id: string;
  status: string; // sent | delivered | read | failed
  recipient_id: string;
  errors?: { title: string }[];
}

interface WaChangeValue {
  contacts?: { profile?: { name?: string }; wa_id: string }[];
  messages?: WaMessage[];
  statuses?: WaStatus[];
}

interface WaWebhookBody {
  object?: string;
  entry?: { changes?: { value: WaChangeValue; field: string }[] }[];
}

function messageText(m: WaMessage): string {
  return (
    m.text?.body ||
    m.button?.text ||
    m.interactive?.button_reply?.title ||
    m.interactive?.list_reply?.title ||
    `[${m.type}]`
  );
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

// ---------- POST: incoming messages / delivery statuses ----------

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

  let body: WaWebhookBody;
  try {
    body = JSON.parse(rawBody) as WaWebhookBody;
  } catch {
    return NextResponse.json({ ok: true }); // ignore bad payloads
  }

  for (const entry of body.entry || []) {
    for (const change of entry.changes || []) {
      const value = change.value;

      for (const msg of value.messages || []) {
        const contact = value.contacts?.find((c) => c.wa_id === msg.from);
        const phone = normalizePhone(`+${msg.from}`);
        const patient = await prisma.patient.findFirst({
          where: { phone: { contains: msg.from.slice(-9) } },
          select: { name: true },
        });
        const who = patient?.name || contact?.profile?.name || phone;

        await notifyAdmin(
          `💬 <b>Mesaj WhatsApp</b> de la ${who} (<code>${phone}</code>)\n${messageText(msg)}`,
        );
      }

      for (const status of value.statuses || []) {
        if (status.status === "failed") {
          const err = status.errors?.[0]?.title || "necunoscută";
          await notifyAdmin(
            `⚠️ WhatsApp către <code>${status.recipient_id}</code> a eșuat: ${err}`,
          );
        }
      }
    }
  }

  return NextResponse.json({ ok: true });
}
