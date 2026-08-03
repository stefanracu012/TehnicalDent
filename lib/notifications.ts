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
import { buildConfirmUrl, formatDateTimeRo, toWhatsAppPhone } from "@/lib/appointments";
import { TELEGRAM_TOPICS, sendTelegramMessage, sendTelegramToTopic, isTelegramConfigured } from "@/lib/telegram";
import { refreshDigestIfRelevant } from "@/lib/telegram-digest";

export { TELEGRAM_TOPICS, sendTelegramToTopic };

// ---- Env ----

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
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 15_000,
  });
  return _transporter;
}

const MAX_ATTEMPTS = 3;

// ---- Low-level senders ----

/**
 * Payload shape for business-initiated WhatsApp messages, which Meta requires
 * to use an approved Message Template outside the 24h customer-service window.
 * queueAndSend() stores this JSON-encoded in Notification.payload; a plain
 * string payload (no `template` field) is sent as freeform text instead,
 * which only works within 24h of the customer's last message (e.g. cancellations).
 */
interface WhatsAppTemplatePayload {
  template: string;
  language: string;
  params: string[];
}

/**
 * Sends a WhatsApp message via Meta WhatsApp Business Cloud API.
 * Phone number must be in E.164 format (e.g. +40712345678).
 * Falls back gracefully if not configured.
 */
async function sendWhatsAppRaw(phone: string, payload: string): Promise<void> {
  if (!WA_TOKEN || !WA_PHONE_ID) {
    throw new Error("WhatsApp not configured (WHATSAPP_TOKEN / WHATSAPP_PHONE_ID)");
  }
  // Meta requires full international MSISDN, no '+', no leading 0 —
  // converts local-format numbers (e.g. "068046719") to "37368046719".
  const to = toWhatsAppPhone(phone);

  let templatePayload: WhatsAppTemplatePayload | null = null;
  try {
    const parsed = JSON.parse(payload);
    if (parsed && typeof parsed.template === "string") templatePayload = parsed;
  } catch {
    templatePayload = null;
  }

  const body = templatePayload
    ? {
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: templatePayload.template,
          language: { code: templatePayload.language },
          components: [
            {
              type: "body",
              parameters: templatePayload.params.map((text) => ({ type: "text", text })),
            },
          ],
        },
      }
    : {
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: payload },
      };

  const res = await fetch(
    `https://graph.facebook.com/v20.0/${WA_PHONE_ID}/messages`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${WA_TOKEN}`,
      },
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`WhatsApp API ${res.status}: ${errBody.slice(0, 300)}`);
  }
}

/**
 * Sends a freeform WhatsApp text message directly (bypassing the Notification
 * queue). Only valid within the 24h customer-service window — used for the
 * inbound-chat auto-reply and manual admin replies in the WhatsApp inbox.
 */
export async function sendWhatsAppText(phone: string, text: string): Promise<void> {
  return sendWhatsAppRaw(phone, text);
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
      await sendTelegramMessage(notif.payload);
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
    if (notif.channel !== "telegram" && isTelegramConfigured()) {
      const channelLabel = notif.channel === "whatsapp" ? "WhatsApp" : notif.channel === "email" ? "email" : notif.channel;
      await sendTelegramToTopic(
        `⚠️ Eroare notificare ${channelLabel} (${notif.type}) către ${notif.recipient}\n${msg}`,
        TELEGRAM_TOPICS.erori,
      );
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
  // Admin: Telegram (topic: Programări noi)
  await sendTelegramToTopic(
    `<b>Programare nouă</b>\n${clientLine(a)}\n📞 ${a.patient.phone}` +
      (a.patient.email ? `\n📧 ${a.patient.email}` : "") +
      (a.notes ? `\n📝 ${a.notes}` : ""),
    TELEGRAM_TOPICS.programariNoi,
  );

  // Client: WhatsApp confirmation request (business-initiated -> template required)
  if (a.patient.phone) {
    const url = buildConfirmUrl(a.id);
    await queueAndSend({
      type: "created",
      channel: "whatsapp",
      recipient: a.patient.phone,
      appointmentId: a.id,
      payload: JSON.stringify({
        template: "programare_noua",
        language: "ro",
        params: [a.patient.name, formatDateTimeRo(a.dateTime), a.service.title, url],
      } satisfies WhatsAppTemplatePayload),
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
  }

  await refreshDigestIfRelevant(a.dateTime);
}

export async function notifyConfirmed(a: AppointmentFull) {
  await queueAndSend({
    type: "confirmed",
    channel: "telegram",
    recipient: "admin",
    appointmentId: a.id,
    payload: `✅ <b>Programare confirmată</b>\n${clientLine(a)}\n📞 ${a.patient.phone}` +
      (a.patient.email ? `\n📧 ${a.patient.email}` : ""),
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

  await refreshDigestIfRelevant(a.dateTime);
}

export async function notifyCancelled(a: AppointmentFull, reason?: string) {
  await sendTelegramToTopic(
    `❌ <b>Programare anulată</b>\n${clientLine(a)}\n📞 ${a.patient.phone}` +
      (a.patient.email ? `\n📧 ${a.patient.email}` : "") +
      (reason ? `\nMotiv: ${reason}` : ""),
    TELEGRAM_TOPICS.anulari,
  );

  // Business-initiated -> template required (programare_anulata: {{1}} data, {{2}} serviciu).
  // A cancellation triggered by the admin panel isn't a reply within the patient's
  // 24h session, so freeform text would silently fail to deliver.
  if (a.patient.phone) {
    await queueAndSend({
      type: "cancelled",
      channel: "whatsapp",
      recipient: a.patient.phone,
      appointmentId: a.id,
      payload: JSON.stringify({
        template: "programare_anulata",
        language: "ro",
        params: [formatDateTimeRo(a.dateTime), a.service.title],
      } satisfies WhatsAppTemplatePayload),
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
  }

  await refreshDigestIfRelevant(a.dateTime);
}

const GOOGLE_REVIEW_URL = "https://g.page/r/CdwzaxKCvF-JEAI/review";

export async function notifyCompleted(a: AppointmentFull) {
  await queueAndSend({
    type: "confirmed",
    channel: "telegram",
    recipient: "admin",
    appointmentId: a.id,
    payload:
      `✅ <b>Programare finalizată</b>\n${clientLine(a)}\n📞 ${a.patient.phone}` +
      (a.patient.email ? `\n📧 ${a.patient.email}` : ""),
  });

  // Business-initiated -> template required (programare_finalizata: {{1}} nume, {{2}} link recenzie).
  if (a.patient.phone) {
    await queueAndSend({
      type: "completed",
      channel: "whatsapp",
      recipient: a.patient.phone,
      appointmentId: a.id,
      payload: JSON.stringify({
        template: "programare_finalizata",
        language: "ro",
        params: [a.patient.name, GOOGLE_REVIEW_URL],
      } satisfies WhatsAppTemplatePayload),
    });
  }

  await refreshDigestIfRelevant(a.dateTime);
}

export async function notifyNoshow(a: AppointmentFull) {
  await queueAndSend({
    type: "confirmed",
    channel: "telegram",
    recipient: "admin",
    appointmentId: a.id,
    payload:
      `👤 <b>Neprezentare</b>\n${clientLine(a)}\n📞 ${a.patient.phone}` +
      (a.patient.email ? `\n📧 ${a.patient.email}` : ""),
  });
  await refreshDigestIfRelevant(a.dateTime);
}

export async function notifyPending(a: AppointmentFull) {
  await queueAndSend({
    type: "created",
    channel: "telegram",
    recipient: "admin",
    appointmentId: a.id,
    payload:
      `⏳ <b>Programare în așteptare</b>\n${clientLine(a)}\n📞 ${a.patient.phone}` +
      (a.patient.email ? `\n📧 ${a.patient.email}` : ""),
  });
  await refreshDigestIfRelevant(a.dateTime);
}

export async function notifyReminder(a: AppointmentFull, kind: "24h" | "2h") {
  const type: NotificationType = kind === "24h" ? "reminder_24h" : "reminder_2h";
  if (!a.patient.phone && !a.patient.email) return;

  const lead = kind === "24h" ? "Vă reamintim că mâine aveţi programare" : "Vă reamintim că peste 2 ore aveţi programare";

  // Business-initiated -> template required (programare_reminder_v2: {{1}} maine/peste 2 ore, {{2}} data, {{3}} serviciu, {{4}} link)
  if (a.patient.phone) {
    await queueAndSend({
      type,
      channel: "whatsapp",
      recipient: a.patient.phone,
      appointmentId: a.id,
      payload: JSON.stringify({
        template: "programare_reminder_v2",
        language: "ro",
        params: [
          kind === "24h" ? "maine" : "peste 2 ore",
          formatDateTimeRo(a.dateTime),
          a.service.title,
          buildConfirmUrl(a.id),
        ],
      } satisfies WhatsAppTemplatePayload),
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

  // Business-initiated -> template required (recall_6luni: {{1}} nume pacient, {{2}} serviciu)
  if (a.patient.phone) {
    await queueAndSend({
      type: "recall_6m",
      channel: "whatsapp",
      recipient: a.patient.phone,
      appointmentId: a.id,
      payload: JSON.stringify({
        template: "recall_6luni",
        language: "ro",
        params: [a.patient.name, a.service.title],
      } satisfies WhatsAppTemplatePayload),
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

  await sendTelegramToTopic(
    `🔔 <b>Recall 6 luni trimis</b>\n👤 ${a.patient.name} 📞 ${a.patient.phone}`,
    TELEGRAM_TOPICS.recall,
  );
}

// =============================================
// Manual admin campaigns (offers / reminders) — sent on demand from
// /admin/campanii to one, several, or all patients. Unlike appointment
// notifications, these aren't tied to a specific appointment.
// =============================================

export type CampaignPayload =
  | { templateKey: "oferta_promo"; service: string; discount: string }
  | { templateKey: "reminder_control"; detail: string };

function buildCampaignEmailHtml(
  patientName: string,
  title: string,
  bodyText: string,
): { subject: string; html: string; text: string } {
  const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
        <tr><td style="padding:24px 28px;border-bottom:1px solid #e5e7eb;background:#0f172a;color:#fff;">
          <h1 style="margin:0;font-size:20px;font-weight:600;">TechnicalDent</h1>
        </td></tr>
        <tr><td style="padding:28px;">
          <h2 style="margin:0 0 12px;font-size:18px;color:#0f172a;">${title}</h2>
          <p style="margin:0 0 8px;color:#374151;font-size:14px;line-height:1.5;">Bună ziua, ${patientName}!</p>
          <p style="margin:0;color:#374151;font-size:14px;line-height:1.5;">${bodyText}</p>
        </td></tr>
        <tr><td style="padding:16px 28px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;font-size:12px;color:#6b7280;">
          TechnicalDent
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  const text = `${title}\n\nBună ziua, ${patientName}!\n\n${bodyText}`;
  return { subject: title, html, text };
}

/**
 * Sends one campaign message to one patient over the requested channels.
 * Returns which channels were actually attempted (skipped if the patient
 * has no phone/email, or that channel wasn't requested).
 */
/** "Toate serviciile" (as picked in the UI) reads awkwardly substituted verbatim into the
 * template sentence — swap it for a phrase that actually fits the surrounding text. */
function serviceLabel(service: string): string {
  return service === "Toate serviciile" ? "toate serviciile noastre" : service;
}

export async function sendCampaignToPatient(
  patient: Patient,
  payload: CampaignPayload,
  channels: { whatsapp: boolean; email: boolean },
): Promise<{ whatsapp: boolean; email: boolean }> {
  const result = { whatsapp: false, email: false };

  const waParams =
    payload.templateKey === "oferta_promo"
      ? [patient.name, serviceLabel(payload.service), payload.discount]
      : [patient.name, payload.detail];

  if (channels.whatsapp && patient.phone) {
    await queueAndSend({
      type: "campaign",
      channel: "whatsapp",
      recipient: patient.phone,
      payload: JSON.stringify({
        template: payload.templateKey,
        language: "ro",
        params: waParams,
      } satisfies WhatsAppTemplatePayload),
    });
    result.whatsapp = true;
  }

  if (channels.email && patient.email) {
    const { title, body } =
      payload.templateKey === "oferta_promo"
        ? {
            title: "Ofertă specială — TechnicalDent",
            body: `Avem o ofertă specială pentru dvs.: <b>${serviceLabel(payload.service)}</b>, cu reducere de <b>${payload.discount}</b>. Doriți să vă programăm? Răspundeți la acest email sau sunați-ne!`,
          }
        : {
            title: "Reamintire control — TechnicalDent",
            body: payload.detail,
          };
    const email = buildCampaignEmailHtml(patient.name, title, body);
    await queueAndSend({
      type: "campaign",
      channel: "email",
      recipient: patient.email,
      payload: JSON.stringify(email),
    });
    result.email = true;
  }

  return result;
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
  const { getSetting } = await import("@/lib/data");
  const configuredMonths = parseInt((await getSetting("recallMonths")) || "", 10);
  const months = Number.isFinite(configuredMonths) && configuredMonths > 0 ? configuredMonths : 6;
  const from = new Date(now - (months + 1) * 30 * DAY);
  const to = new Date(now - months * 30 * DAY);

  const candidates = await prisma.appointment.findMany({
    where: {
      status: { in: ["confirmed", "completed", "cancelled"] },
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
