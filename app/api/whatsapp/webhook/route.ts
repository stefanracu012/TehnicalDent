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
//                          - where a conversation that needs a person is
//                            announced (not every message — see lib/lead-telegram.ts)
// =============================================

import crypto from "crypto";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { captureLead, setLeadFromChat } from "@/lib/leads";
import { shouldReply, assistantReply, pausedUntil } from "@/lib/assistant";
import { normalizePhone } from "@/lib/appointments";
import { handleOptOut } from "@/lib/marketing-optout";
import { sendWhatsAppText, sendTelegramToTopic, TELEGRAM_TOPICS } from "@/lib/notifications";

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || "";
const APP_SECRET = process.env.WHATSAPP_APP_SECRET || "";

const AUTO_REPLY =
  "Bună ziua! Am primit mesajul dvs. Vă vom contacta în cel mai scurt timp posibil. — Tehnical Dent";

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
  // entry.id is the WhatsApp Business Account id. Meta sends it on every
  // event; nothing else exposes it — the Graph API will not hand it over from
  // a phone-number token, and it is needed to read or edit message templates.
  entry?: { id?: string; changes?: { value: WaChangeValue; field: string }[] }[];
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
    // Recorded once, then available to the template tooling without anyone
    // having to go and find it in Business Suite.
    if (entry.id) {
      await prisma.siteSettings
        .upsert({
          where: { key: "whatsapp_waba_id" },
          create: {
            key: "whatsapp_waba_id",
            value: entry.id,
            description: "WhatsApp Business Account id, captured from a webhook",
          },
          update: { value: entry.id },
        })
        .catch((error) => console.warn("Could not record the WABA id:", error));
    }

    for (const change of entry.changes || []) {
      const value = change.value;

      for (const msg of value.messages || []) {
        // Meta retries webhook delivery on failure — skip messages we already stored.
        const already = await prisma.whatsAppMessage.findFirst({
          where: { waMessageId: msg.id },
          select: { id: true },
        });
        if (already) continue;

        const contact = value.contacts?.find((c) => c.wa_id === msg.from);
        const phone = normalizePhone(`+${msg.from}`);
        const patient = await prisma.patient.findFirst({
          where: { phone: { contains: msg.from.slice(-9) } },
          select: { id: true, name: true },
        });
        const text = messageText(msg);

        await prisma.whatsAppMessage.create({
          data: {
            phone,
            direction: "in",
            body: text,
            waMessageId: msg.id,
            patientId: patient?.id,
          },
        });

        // Someone already in the patient list is not a lead.
        if (!patient) {
          await captureLead({
            source: "whatsapp",
            reference: phone,
            name: contact?.profile?.name ?? null,
            phone,
            message: text,
          });
        }

        // Telegram no longer hears about every message — only about a
        // conversation a person has to act on, below. The inbox shows the rest.

        try {
          // "STOP" is answered before anything else looks at the message. It
          // is not a question for the assistant, and letting a model decide
          // whether someone unsubscribed is not a decision worth delegating.
          // Nobody has to act on it, so nobody is pinged.
          const optOut = await handleOptOut(phone, text);
          if (optOut) {
            await sendWhatsAppText(phone, optOut);
            await prisma.whatsAppMessage.create({
              data: { phone, direction: "out", body: optOut, patientId: patient?.id },
            });
            continue;
          }

          // The assistant answers only where it has been switched on. Anywhere
          // else the old fixed acknowledgement stands, so turning the feature
          // off never leaves a patient with silence.
          // A colleague is already in this conversation, so nothing automatic
          // goes out — not the assistant, and not the fixed acknowledgement
          // either. That acknowledgement exists to cover the assistant being
          // switched off, which is a different situation: there, nobody is
          // answering. Here somebody is, and "we will contact you shortly"
          // landing under their reply is worse than saying nothing.
          if (await pausedUntil("whatsapp", phone)) {
            continue;
          }

          let reply = AUTO_REPLY;
          // The fixed reply promises that somebody will get in touch, so
          // whenever it is what goes out, somebody has to: the conversation is
          // flagged urgent. Telegram hears about it once, and a colleague
          // answering from the panel clears it.
          let needsPerson =
            "A scris pe WhatsApp, iar asistentul nu e pornit pentru această conversație. " +
            "A primit răspunsul automat „vă vom contacta”.";

          if (await shouldReply("whatsapp", phone)) {
            const recent = await prisma.whatsAppMessage.findMany({
              where: { phone },
              orderBy: { createdAt: "desc" },
              take: 60,
              select: { direction: true, body: true, createdAt: true },
            });

            const answer = await assistantReply(
              recent
                .reverse()
                .map((m) => ({
                  role: m.direction === "in" ? ("user" as const) : ("assistant" as const),
                  content: m.body,
                  at: m.createdAt,
                })),
              patient ? { name: patient.name, phone } : null,
              { channel: "whatsapp", handle: phone },
            );

            // Falling back rather than staying quiet: a patient who wrote is
            // owed an answer even when the model could not produce one.
            if (answer) {
              reply = answer;
              needsPerson = "";
            } else {
              needsPerson =
                "Asistentul nu a putut răspunde, așa că a primit răspunsul automat „vă vom contacta”.";
            }
          }

          try {
            await sendWhatsAppText(phone, reply);
            await prisma.whatsAppMessage.create({
              data: { phone, direction: "out", body: reply, patientId: patient?.id },
            });
          } catch (sendError) {
            console.error("WhatsApp reply could not be sent:", sendError);
            needsPerson = "Răspunsul pe WhatsApp nu a putut fi trimis — pacientul nu a primit nimic.";
          }

          if (needsPerson) {
            await setLeadFromChat(
              { channel: "whatsapp", handle: phone },
              "urgent",
              needsPerson,
              patient ? { name: patient.name, phone } : null,
            );
          }
        } catch (err) {
          console.error("WhatsApp auto-reply error:", err);
        }
      }

      for (const status of value.statuses || []) {
        if (status.status === "failed") {
          const err = status.errors?.[0]?.title || "necunoscută";
          await sendTelegramToTopic(
            `⚠️ WhatsApp către <code>${status.recipient_id}</code> a eșuat: ${err}`,
            TELEGRAM_TOPICS.erori,
          );
        }
      }
    }
  }

  return NextResponse.json({ ok: true });
}
