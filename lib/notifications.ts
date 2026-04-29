// =============================================
// Notifications — Telegram (admin) + WhatsApp (client)
// Generic queue/sender used by appointment triggers
// and by the cron endpoint.
// =============================================

import prisma from "@/lib/prisma";
import {
  type NotificationChannel,
  type NotificationType,
  type Appointment,
  type Patient,
  type Service,
} from "@prisma/client";
import { buildConfirmUrl, formatDateTimeRo } from "@/lib/appointments";

// ---- Env ----

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
// Accept either TELEGRAM_ADMIN_CHAT_ID (booking module) or TELEGRAM_CHAT_ID (existing contact form)
const TELEGRAM_CHAT_ID =
  process.env.TELEGRAM_ADMIN_CHAT_ID || process.env.TELEGRAM_CHAT_ID || "";

// WhatsApp Business Cloud API (Meta)
const WA_TOKEN = process.env.WHATSAPP_TOKEN || "";
const WA_PHONE_ID = process.env.WHATSAPP_PHONE_ID || "";

const MAX_ATTEMPTS = 3;

// ---- Low-level senders ----

async function sendTelegramRaw(text: string): Promise<void> {
  if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_ID) {
    throw new Error("Telegram not configured (TELEGRAM_BOT_TOKEN / TELEGRAM_ADMIN_CHAT_ID)");
  }
  const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Telegram API ${res.status}: ${body.slice(0, 200)}`);
  }
}

/**
 * Sends a WhatsApp message via Meta WhatsApp Business Cloud API.
 * Phone number must be in E.164 format (e.g. +40712345678).
 * Falls back gracefully if not configured.
 */
async function sendWhatsAppRaw(phone: string, text: string): Promise<void> {
  if (!WA_TOKEN || !WA_PHONE_ID) {
    throw new Error("WhatsApp not configured (WHATSAPP_TOKEN / WHATSAPP_PHONE_ID)");
  }
  // Meta requires phone in E.164 without leading '+'
  const to = phone.replace(/^\+/, "").replace(/\s/g, "");
  const res = await fetch(
    `https://graph.facebook.com/v20.0/${WA_PHONE_ID}/messages`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${WA_TOKEN}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: text },
      }),
    },
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`WhatsApp API ${res.status}: ${body.slice(0, 300)}`);
  }
}

// ---- Queue + retry ----

export interface QueueParams {
  type: NotificationType;
  channel: NotificationChannel;
  recipient: string;
  payload: string;
  appointmentId?: string;
}

/**
 * Queue a notification and try to send it immediately.
 * On failure, it stays in DB with status=failed and can be retried by cron.
 */
export async function queueAndSend(p: QueueParams) {
  const notif = await prisma.notification.create({
    data: {
      type: p.type,
      channel: p.channel,
      recipient: p.recipient,
      payload: p.payload,
      appointmentId: p.appointmentId,
      status: "queued",
    },
  });
  await tryDispatch(notif.id);
}

async function tryDispatch(notificationId: string): Promise<void> {
  const notif = await prisma.notification.findUnique({ where: { id: notificationId } });
  if (!notif) return;
  if (notif.status === "sent") return;
  if (notif.attempts >= MAX_ATTEMPTS) return;

  try {
    if (notif.channel === "telegram") {
      await sendTelegramRaw(notif.payload);
    } else if (notif.channel === "whatsapp") {
      await sendWhatsAppRaw(notif.recipient, notif.payload);
    } else {
      throw new Error(`Channel ${notif.channel} not implemented`);
    }
    await prisma.notification.update({
      where: { id: notif.id },
      data: { status: "sent", sentAt: new Date(), attempts: { increment: 1 }, error: null },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await prisma.notification.update({
      where: { id: notif.id },
      data: { status: "failed", attempts: { increment: 1 }, error: msg },
    });
    // Also alert admin via Telegram if it was a non-telegram failure
    if (notif.channel !== "telegram" && TELEGRAM_TOKEN && TELEGRAM_CHAT_ID) {
      try {
        await sendTelegramRaw(
          `⚠️ Eroare notificare WhatsApp (${notif.type}) către ${notif.recipient}\n${msg}`,
        );
      } catch {
        // ignore
      }
    }
  }
}

/**
 * Retry all failed notifications that still have attempts left.
 * Called by the cron endpoint.
 */
export async function retryFailed(): Promise<number> {
  const stuck = await prisma.notification.findMany({
    where: { status: "failed", attempts: { lt: MAX_ATTEMPTS } },
    select: { id: true },
    take: 50,
  });
  for (const n of stuck) await tryDispatch(n.id);
  return stuck.length;
}

// =============================================
// Domain triggers — composes message + sends
// =============================================

type AppointmentFull = Appointment & { patient: Patient; service: Service };

function clientLine(a: AppointmentFull): string {
  return [
    `📅 ${formatDateTimeRo(a.dateTime)}`,
    `🦷 ${a.service.title}`,
    `👤 ${a.patient.name}`,
  ].join("\n");
}

export async function notifyCreated(a: AppointmentFull) {
  // Admin: Telegram
  await queueAndSend({
    type: "created",
    channel: "telegram",
    recipient: TELEGRAM_CHAT_ID || "admin",
    appointmentId: a.id,
    payload:
      `<b>Programare nouă</b>\n${clientLine(a)}\n📞 ${a.patient.phone}` +
      (a.notes ? `\n📝 ${a.notes}` : ""),
  });

  // Client: WhatsApp confirmation request
  if (a.patient.phone) {
    const url = buildConfirmUrl(a.id);
    await queueAndSend({
      type: "created",
      channel: "whatsapp",
      recipient: a.patient.phone,
      appointmentId: a.id,
      payload:
        `Bună ziua, ${a.patient.name}!\n` +
        `Programarea dvs. la TechnicalDent:\n${clientLine(a)}\n\n` +
        `Vă rugăm să confirmați sau să anulați aici:\n${url}`,
    });
  }
}

export async function notifyConfirmed(a: AppointmentFull) {
  await queueAndSend({
    type: "confirmed",
    channel: "telegram",
    recipient: TELEGRAM_CHAT_ID || "admin",
    appointmentId: a.id,
    payload: `✅ <b>Programare confirmată</b>\n${clientLine(a)}\n📞 ${a.patient.phone}`,
  });
}

export async function notifyCancelled(a: AppointmentFull, reason?: string) {
  await queueAndSend({
    type: "cancelled",
    channel: "telegram",
    recipient: TELEGRAM_CHAT_ID || "admin",
    appointmentId: a.id,
    payload:
      `❌ <b>Programare anulată</b>\n${clientLine(a)}\n📞 ${a.patient.phone}` +
      (reason ? `\nMotiv: ${reason}` : ""),
  });

  if (a.patient.phone) {
    await queueAndSend({
      type: "cancelled",
      channel: "whatsapp",
      recipient: a.patient.phone,
      appointmentId: a.id,
      payload:
        `Programarea dvs. la TechnicalDent din ${formatDateTimeRo(a.dateTime)} (${a.service.title}) a fost anulată.\n` +
        `Vă rugăm să ne contactați pentru reprogramare.`,
    });
  }
}

export async function notifyReminder(a: AppointmentFull, kind: "24h" | "2h") {
  const type: NotificationType = kind === "24h" ? "reminder_24h" : "reminder_2h";
  if (!a.patient.phone) return;

  const lead = kind === "24h" ? "Vă reamintim că mâine aveți programare" : "Vă reamintim că peste 2 ore aveți programare";
  await queueAndSend({
    type,
    channel: "whatsapp",
    recipient: a.patient.phone,
    appointmentId: a.id,
    payload:
      `${lead} la TechnicalDent:\n${clientLine(a)}\n\n` +
      `Pentru anulare: ${buildConfirmUrl(a.id)}`,
  });
}

export async function notifyRecall(a: AppointmentFull) {
  if (!a.patient.phone) return;
  await queueAndSend({
    type: "recall_6m",
    channel: "whatsapp",
    recipient: a.patient.phone,
    appointmentId: a.id,
    payload:
      `Bună ziua, ${a.patient.name}!\n` +
      `Au trecut 6 luni de la ultima vizită la TechnicalDent (${a.service.title}).\n` +
      `Vă recomandăm o nouă consultație. Vă așteptăm cu drag!`,
  });

  await queueAndSend({
    type: "recall_6m",
    channel: "telegram",
    recipient: TELEGRAM_CHAT_ID || "admin",
    appointmentId: a.id,
    payload: `🔔 <b>Recall 6 luni trimis</b>\n👤 ${a.patient.name} 📞 ${a.patient.phone}`,
  });
}

// =============================================
// Cron-driven scans
// =============================================

const HOUR = 60 * 60_000;
const DAY = 24 * HOUR;

/**
 * Scans for appointments needing 24h / 2h reminders and sends them.
 * Idempotent via `remindedAt` field (we send each reminder window only once).
 */
export async function runReminderScan() {
  const now = Date.now();

  // 24h window: appointments between now+23h and now+25h with remindedAt < now-22h
  const r24 = await prisma.appointment.findMany({
    where: {
      status: { in: ["pending", "confirmed"] },
      dateTime: {
        gte: new Date(now + 23 * HOUR),
        lte: new Date(now + 25 * HOUR),
      },
      OR: [
        { remindedAt: null },
        { remindedAt: { lt: new Date(now - 22 * HOUR) } },
      ],
    },
    include: { patient: true, service: true },
  });
  for (const a of r24) {
    await notifyReminder(a, "24h");
    await prisma.appointment.update({
      where: { id: a.id },
      data: { remindedAt: new Date() },
    });
  }

  // 2h window: appointments between now+90min and now+150min that have NOT been reminded in last 90min
  const r2 = await prisma.appointment.findMany({
    where: {
      status: { in: ["pending", "confirmed"] },
      dateTime: {
        gte: new Date(now + 90 * 60_000),
        lte: new Date(now + 150 * 60_000),
      },
      OR: [
        { remindedAt: null },
        { remindedAt: { lt: new Date(now - 90 * 60_000) } },
      ],
    },
    include: { patient: true, service: true },
  });
  for (const a of r2) {
    await notifyReminder(a, "2h");
    await prisma.appointment.update({
      where: { id: a.id },
      data: { remindedAt: new Date() },
    });
  }

  return { reminded24h: r24.length, reminded2h: r2.length };
}

/**
 * 6-month recall: for every patient whose last completed/confirmed appointment
 * was ~6 months ago and who has no future appointment, send a recall.
 */
export async function runRecallScan() {
  const now = Date.now();
  const from = new Date(now - 7 * 30 * DAY);
  const to = new Date(now - 6 * 30 * DAY);

  const candidates = await prisma.appointment.findMany({
    where: {
      status: { in: ["confirmed", "completed"] },
      recallSent: false,
      dateTime: { gte: from, lte: to },
    },
    include: { patient: true, service: true },
  });

  let count = 0;
  for (const a of candidates) {
    // Skip if patient has any future appointment
    const future = await prisma.appointment.findFirst({
      where: {
        patientId: a.patientId,
        dateTime: { gt: new Date() },
      },
      select: { id: true },
    });
    if (future) {
      await prisma.appointment.update({
        where: { id: a.id },
        data: { recallSent: true },
      });
      continue;
    }
    await notifyRecall(a);
    await prisma.appointment.update({
      where: { id: a.id },
      data: { recallSent: true },
    });
    count++;
  }
  return { recalled: count };
}
