// =============================================
// Notifications — Telegram (admin) + WhatsApp + Email (client)
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

// Email (Nodemailer SMTP)
import nodemailer, { type Transporter } from "nodemailer";
const SMTP_HOST = process.env.SMTP_HOST || "";
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "587", 10);
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || "";
const SMTP_SECURE =
  process.env.SMTP_SECURE === "true" || SMTP_PORT === 465;
const EMAIL_FROM = process.env.EMAIL_FROM || "TechnicalDent <noreply@tehnicaldent.md>";

let _transporter: Transporter | null = null;
function getTransporter(): Transporter {
  if (_transporter) return _transporter;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    throw new Error("Email not configured (SMTP_HOST / SMTP_USER / SMTP_PASS)");
  }
  _transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return _transporter;
}

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

/**
 * Sends an HTML email via Resend (https://resend.com).
 * The payload format we use is JSON: { subject, html, text }.
 */
interface EmailPayload {
  subject: string;
  html: string;
  text: string;
}

async function sendEmailRaw(to: string, payload: EmailPayload): Promise<void> {
  const transporter = getTransporter();
  await transporter.sendMail({
    from: EMAIL_FROM,
    to,
    subject: payload.subject,
    html: payload.html,
    text: payload.text,
  });
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
    } else if (notif.channel === "email") {
      // payload is JSON: { subject, html, text }
      let parsed: EmailPayload;
      try {
        parsed = JSON.parse(notif.payload) as EmailPayload;
      } catch {
        throw new Error("Invalid email payload JSON");
      }
      await sendEmailRaw(notif.recipient, parsed);
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

/**
 * Builds an HTML email with optional confirm/cancel buttons.
 * Buttons link to the public page with ?action=... so the page auto-executes.
 */
function buildEmailHtml(
  a: AppointmentFull,
  opts: {
    title: string;
    intro: string;
    showActions?: boolean;
    footer?: string;
  },
): { subject: string; html: string; text: string } {
  const baseUrl = buildConfirmUrl(a.id); // includes ?token=...
  const confirmUrl = `${baseUrl}&action=confirm`;
  const cancelUrl = `${baseUrl}&action=cancel`;
  const when = formatDateTimeRo(a.dateTime);

  const actionsHtml = opts.showActions
    ? `
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px auto 8px;">
        <tr>
          <td style="padding:0 6px;">
            <a href="${confirmUrl}" style="display:inline-block;padding:12px 22px;background:#16a34a;color:#fff;text-decoration:none;font-weight:600;border-radius:6px;font-family:Arial,sans-serif;font-size:14px;">✓ Confirmă</a>
          </td>
          <td style="padding:0 6px;">
            <a href="${cancelUrl}" style="display:inline-block;padding:12px 22px;background:#dc2626;color:#fff;text-decoration:none;font-weight:600;border-radius:6px;font-family:Arial,sans-serif;font-size:14px;">✕ Anulează</a>
          </td>
        </tr>
      </table>
      <p style="text-align:center;font-size:12px;color:#6b7280;margin:8px 0 0;">
        sau accesează: <a href="${baseUrl}" style="color:#3b82f6;">${baseUrl}</a>
      </p>`
    : "";

  const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
        <tr><td style="padding:24px 28px;border-bottom:1px solid #e5e7eb;background:#0f172a;color:#fff;">
          <h1 style="margin:0;font-size:20px;font-weight:600;">TechnicalDent</h1>
        </td></tr>
        <tr><td style="padding:28px;">
          <h2 style="margin:0 0 12px;font-size:18px;color:#0f172a;">${opts.title}</h2>
          <p style="margin:0 0 18px;color:#374151;font-size:14px;line-height:1.5;">${opts.intro}</p>
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;">
            <tr><td style="padding:14px 16px;border-bottom:1px solid #e5e7eb;">
              <div style="font-size:11px;text-transform:uppercase;color:#6b7280;letter-spacing:.05em;">Pacient</div>
              <div style="font-size:14px;color:#0f172a;font-weight:600;margin-top:2px;">${a.patient.name}</div>
            </td></tr>
            <tr><td style="padding:14px 16px;border-bottom:1px solid #e5e7eb;">
              <div style="font-size:11px;text-transform:uppercase;color:#6b7280;letter-spacing:.05em;">Serviciu</div>
              <div style="font-size:14px;color:#0f172a;font-weight:600;margin-top:2px;">${a.service.title}</div>
            </td></tr>
            <tr><td style="padding:14px 16px;">
              <div style="font-size:11px;text-transform:uppercase;color:#6b7280;letter-spacing:.05em;">Data şi ora</div>
              <div style="font-size:14px;color:#0f172a;font-weight:600;margin-top:2px;">${when}</div>
            </td></tr>
          </table>
          ${actionsHtml}
          ${opts.footer ? `<p style="margin:20px 0 0;color:#6b7280;font-size:13px;line-height:1.5;">${opts.footer}</p>` : ""}
        </td></tr>
        <tr><td style="padding:16px 28px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;font-size:12px;color:#6b7280;">
          TechnicalDent · Acest mesaj este automat, nu răspundeţi.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  const text =
    `${opts.title}\n\n${opts.intro}\n\n` +
    `Pacient: ${a.patient.name}\nServiciu: ${a.service.title}\nData: ${when}\n` +
    (opts.showActions
      ? `\nConfirmă: ${confirmUrl}\nAnulează: ${cancelUrl}\n`
      : "") +
    (opts.footer ? `\n${opts.footer}\n` : "");

  return { subject: opts.title, html, text };
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
  // Client: Email with confirm/cancel buttons
  if (a.patient.email) {
    const email = buildEmailHtml(a, {
      title: "Programare nouă — confirmaţi, vă rugăm",
      intro: `Bună ziua, ${a.patient.name}! Vă rugăm să confirmaţi sau să anulaţi programarea de mai jos.`,
      showActions: true,
      footer: "Pentru orice nelămurire, ne puteţi contacta telefonic.",
    });
    await queueAndSend({
      type: "created",
      channel: "email",
      recipient: a.patient.email,
      appointmentId: a.id,
      payload: JSON.stringify(email),
    });
  }}

export async function notifyConfirmed(a: AppointmentFull) {
  await queueAndSend({
    type: "confirmed",
    channel: "telegram",
    recipient: TELEGRAM_CHAT_ID || "admin",
    appointmentId: a.id,
    payload: `✅ <b>Programare confirmată</b>\n${clientLine(a)}\n📞 ${a.patient.phone}`,
  });

  if (a.patient.email) {
    const email = buildEmailHtml(a, {
      title: "Programare confirmată",
      intro: `Vă mulţumim, ${a.patient.name}! Programarea dvs. a fost confirmată.`,
      showActions: false,
      footer: "Dacă nu vă mai puteţi prezenta, vă rugăm să ne contactaţi din timp.",
    });
    await queueAndSend({
      type: "confirmed",
      channel: "email",
      recipient: a.patient.email,
      appointmentId: a.id,
      payload: JSON.stringify(email),
    });
  }
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
  if (a.patient.email) {
    const email = buildEmailHtml(a, {
      title: "Programare anulată",
      intro: `Programarea dvs. de mai jos a fost anulată${reason ? ` (${reason})` : ""}.`,
      showActions: false,
      footer: "Pentru reprogramare, ne puteţi contacta telefonic.",
    });
    await queueAndSend({
      type: "cancelled",
      channel: "email",
      recipient: a.patient.email,
      appointmentId: a.id,
      payload: JSON.stringify(email),
    });
  }}

export async function notifyReminder(a: AppointmentFull, kind: "24h" | "2h") {
  const type: NotificationType = kind === "24h" ? "reminder_24h" : "reminder_2h";
  if (!a.patient.phone && !a.patient.email) return;

  const lead = kind === "24h" ? "Vă reamintim că mâine aveţi programare" : "Vă reamintim că peste 2 ore aveţi programare";

  if (a.patient.phone) {
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

  if (a.patient.email) {
    const email = buildEmailHtml(a, {
      title: kind === "24h" ? "Reamintire — programare mâine" : "Reamintire — programare peste 2 ore",
      intro: `${lead} la TechnicalDent.`,
      showActions: true,
      footer: "Dacă nu vă mai puteţi prezenta, anulaţi programarea folosind butonul de mai sus.",
    });
    await queueAndSend({
      type,
      channel: "email",
      recipient: a.patient.email,
      appointmentId: a.id,
      payload: JSON.stringify(email),
    });
  }
}

export async function notifyRecall(a: AppointmentFull) {
  if (!a.patient.phone && !a.patient.email) return;

  if (a.patient.phone) {
    await queueAndSend({
      type: "recall_6m",
      channel: "whatsapp",
      recipient: a.patient.phone,
      appointmentId: a.id,
      payload:
        `Bună ziua, ${a.patient.name}!\n` +
        `Au trecut 6 luni de la ultima vizită la TechnicalDent (${a.service.title}).\n` +
        `Vă recomandăm o nouă consultaţie. Vă aşteptăm cu drag!`,
    });
  }

  if (a.patient.email) {
    const email = buildEmailHtml(a, {
      title: "V-aă şteaptă o nouă vizită la TechnicalDent",
      intro: `Bună ziua, ${a.patient.name}! Au trecut 6 luni de la ultima dvs. vizită. Vă recomandăm o nouă consultaţie.`,
      showActions: false,
      footer: "Pentru a vă programa, ne puteţi contacta telefonic sau prin formularul de pe site.",
    });
    await queueAndSend({
      type: "recall_6m",
      channel: "email",
      recipient: a.patient.email,
      appointmentId: a.id,
      payload: JSON.stringify(email),
    });
  }

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
