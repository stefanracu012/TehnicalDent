// =============================================
// Telegram bot webhook
// Lets the admin create patients & appointments
// from inside the Telegram chat.
//
// Setup (once):
//   1. Set TELEGRAM_WEBHOOK_SECRET in env (random string).
//   2. POST to https://api.telegram.org/bot<TOKEN>/setWebhook
//      with url=https://<your-site>/api/telegram/webhook/<SECRET>
//   3. Only updates from TELEGRAM_CHAT_ID (admin) are accepted.
// =============================================

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { AppointmentStatus } from "@prisma/client";
import {
  isValidPhone,
  normalizePhone,
  parseDateTime,
  findOverlappingAppointment,
  generateConfirmToken,
  formatDateTimeRo,
  patientSearchOr,
} from "@/lib/appointments";
import { notifyCreated } from "@/lib/notifications";
import { TELEGRAM_TOPICS, answerCallbackQuery, sendTelegramMessage, pinTelegramMessage } from "@/lib/telegram";
import { refreshDayDigest, type DigestKey } from "@/lib/telegram-digest";
import {
  MENU_PACIENTI,
  MENU_PROGRAMARI,
  REPLY_KEYBOARD,
  startPacientNou,
  startProgramareNoua,
  startCautaPacient,
  showAllPacienti,
  showProgramariList,
  handleWizardMessage,
  handleWizardCallback,
  handleReplyKeyboardButton,
} from "@/lib/telegram-wizard";

const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const ADMIN_CHAT_ID =
  process.env.TELEGRAM_ADMIN_CHAT_ID || process.env.TELEGRAM_CHAT_ID || "";
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || "";

interface RouteParams {
  params: Promise<{ secret: string }>;
}

// ---------- Telegram helpers ----------

async function tgSend(chatId: number | string, text: string, threadId?: number) {
  if (!TG_TOKEN) return;
  await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
      ...(threadId ? { message_thread_id: threadId } : {}),
    }),
  }).catch(() => {});
}

async function tgAnswerCallback(callbackId: string, text: string) {
  if (!TG_TOKEN) return;
  await fetch(`https://api.telegram.org/bot${TG_TOKEN}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: callbackId, text, show_alert: false }),
  }).catch(() => {});
}

async function tgEditMessage(
  chatId: number | string,
  messageId: number,
  text: string,
) {
  if (!TG_TOKEN) return;
  await fetch(`https://api.telegram.org/bot${TG_TOKEN}/editMessageText`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: "HTML",
    }),
  }).catch(() => {});
}

const STATUS_EMOJI: Record<string, string> = {
  pending: "🟡",
  confirmed: "🟢",
  completed: "✅",
  cancelled: "❌",
  noshow: "👤",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Așteptare",
  confirmed: "Confirmat",
  completed: "Finalizat",
  cancelled: "Anulat",
  noshow: "Neprezent",
};

const HELP = `<b>Comenzi disponibile</b>

/help — afișează acest mesaj
/menu — meniu cu butoane (Pacienți / Programări noi)
/servicii — listă servicii (cu slug + durată)
/pacienti [text] — caută pacienți după nume sau telefon

<b>Pacient nou</b> (virgulă între câmpuri, telefon SAU email obligatoriu):
<code>/pacient_nou Nume Prenume, telefon, email</code>
<code>/pacient_nou Nume Prenume, telefon</code>
<code>/pacient_nou Nume Prenume, email</code>
Ex: <code>/pacient_nou Ion Popescu, 0712345678, ion@mail.com</code>
Ex: <code>/pacient_nou Maria Ionescu, 0723456789</code>

<b>Programare nouă</b> (cu virgulă):
<code>/programare_noua telefon, slug_serviciu, YYYY-MM-DD HH:MM, durată_min?</code>
Ex: <code>/programare_noua 0712345678, albire-dentara, 2026-05-10 14:30, 60</code>
(Pacientul trebuie să existe — folosește /pacient_nou mai întâi.)

<b>Listă programări:</b>
/programari — următoarele 30 de zile
/programari azi
/programari maine
/programari YYYY-MM-DD`;

function splitComma(rest: string): string[] {
  return rest.split(",").map((s) => s.trim()).filter(Boolean);
}

// Parse /pacient_nou: first token = name, rest = phone/email in any order
function parsePacientComma(rest: string): {
  name: string;
  phone: string;
  email: string;
} {
  const parts = splitComma(rest);
  const name = parts[0] || "";
  const phonePat = /^[+]?[\d\s\-().]{7,20}$/;
  const emailPat = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  let phone = "";
  let email = "";
  for (const p of parts.slice(1)) {
    if (!email && emailPat.test(p)) email = p;
    else if (!phone && phonePat.test(p)) phone = p;
  }
  return { name, phone, email };
}

// ---------- Command handlers ----------

async function cmdServicii(): Promise<string> {
  const services = await prisma.service.findMany({
    orderBy: { title: "asc" },
    select: { slug: true, title: true },
    take: 80,
  });
  if (!services.length) return "Niciun serviciu găsit în baza de date.";
  return (
    `<b>Servicii (${services.length})</b>\n` +
    services
      .map((s) => `• <code>${s.slug}</code> — ${s.title}`)
      .join("\n")
  );
}

async function cmdPacienti(query: string): Promise<string> {
  const q = query.trim();
  const where = q ? { OR: patientSearchOr(q) } : {};
  const patients = await prisma.patient.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { name: true, phone: true, email: true },
  });
  if (!patients.length) return "Niciun pacient găsit.";
  return (
    `<b>Pacienți (${patients.length})</b>\n` +
    patients
      .map(
        (p) =>
          `• ${p.name} — <code>${p.phone}</code>${p.email ? ` · ${p.email}` : ""}`,
      )
      .join("\n")
  );
}

async function cmdPacientNou(rest: string): Promise<string> {
  const { name, phone: phoneRaw, email } = parsePacientComma(rest);

  if (!name || name.length < 2)
    return (
      "❌ Lipsește numele.\n" +
      "Format: <code>/pacient_nou Nume, telefon, email</code>\n" +
      "Ex: <code>/pacient_nou Ion Popescu, 0712345678</code>"
    );
  if (!phoneRaw && !email)
    return (
      "❌ Trebuie cel puțin telefon sau email.\n" +
      "Ex: <code>/pacient_nou Ion Popescu, 0712345678</code>\n" +
      "Ex: <code>/pacient_nou Ion Popescu, ion@mail.com</code>"
    );
  if (phoneRaw && !isValidPhone(phoneRaw))
    return (
      "❌ Telefon invalid (7-15 cifre).\n" +
      "Ex: <code>/pacient_nou Ion Popescu, 0712345678</code>"
    );

  const phone = phoneRaw ? normalizePhone(phoneRaw) : null;
  // dedup: check by phone (if provided) or email
  const orClause = [
    ...(phone ? [{ phone }] : []),
    ...(email ? [{ email: email.trim() }] : []),
  ];
  const existing = await prisma.patient.findFirst({ where: { OR: orClause } });
  if (existing) {
    return `⚠️ Există deja: <b>${existing.name}</b> — <code>${existing.phone}</code>${existing.email ? ` · ${existing.email}` : ""}`;
  }

  const p = await prisma.patient.create({
    data: {
      name: name.trim(),
      phone: phone ?? "",
      email: email ? email.trim() : null,
    },
  });
  return (
    `✅ <b>Pacient creat</b>\n` +
    `👤 ${p.name}` +
    (p.phone ? `\n📞 <code>${p.phone}</code>` : "") +
    (p.email ? `\n📧 ${p.email}` : "")
  );
}

async function cmdProgramareNoua(rest: string): Promise<string> {
  const parts = splitComma(rest);
  if (parts.length < 3) {
    return (
      "❌ Format: <code>/programare_noua telefon, slug_serviciu, YYYY-MM-DD HH:MM, durată?</code>\n" +
      "Folosește /servicii pentru lista de slug-uri."
    );
  }
  const [phoneRaw, slug, dateStr, durStr] = parts;
  if (!isValidPhone(phoneRaw)) return "❌ Telefon invalid.";

  const phone = normalizePhone(phoneRaw);
  const patient = await prisma.patient.findFirst({ where: { phone } });
  if (!patient) {
    return `❌ Pacientul cu telefon <code>${phone}</code> nu există. Creează-l cu /pacient_nou.`;
  }

  const service = await prisma.service.findUnique({ where: { slug } });
  if (!service) {
    return `❌ Serviciul <code>${slug}</code> nu există. Vezi /servicii.`;
  }
  const serviceDuration = (service as { duration?: number }).duration ?? 30;
  const durStr_parsed = parts[3];
  const duration =
    durStr_parsed && /^\d+$/.test(durStr_parsed) ? parseInt(durStr_parsed, 10) : serviceDuration;

  // Accept "YYYY-MM-DD HH:MM" by converting space to 'T'
  const isoCandidate = dateStr.includes("T") ? dateStr : dateStr.replace(" ", "T");
  const dt = parseDateTime(isoCandidate);
  if (!dt) return "❌ Dată/oră invalidă (folosește YYYY-MM-DD HH:MM).";
  if (dt.getTime() < Date.now() - 60_000) return "❌ Data este în trecut.";

  const overlap = await findOverlappingAppointment({ dateTime: dt, duration });
  if (overlap) {
    return `❌ Suprapunere cu o programare existentă (id <code>${overlap.id}</code>).`;
  }

  const created = await prisma.appointment.create({
    data: {
      patientId: patient.id,
      serviceId: service.id,
      dateTime: dt,
      duration,
      status: "pending",
    },
    include: { patient: true, service: true },
  });

  await prisma.appointment.update({
    where: { id: created.id },
    data: { confirmToken: generateConfirmToken(created.id) },
  });

  // Fire notifications (Telegram echo + WhatsApp/email to patient if configured)
  notifyCreated(created).catch((e) => console.error("notifyCreated:", e));

  return (
    `✅ <b>Programare creată</b>\n` +
    `👤 ${patient.name} (<code>${patient.phone}</code>)\n` +
    `🦷 ${service.title}\n` +
    `📅 ${formatDateTimeRo(dt)} (${duration} min)`
  );
}

async function cmdProgramari(arg: string): Promise<string> {
  const a = arg.trim().toLowerCase();
  let from = new Date();
  from.setHours(0, 0, 0, 0);
  let to = new Date(from.getTime() + 30 * 24 * 60 * 60_000);

  if (a === "azi") {
    to = new Date(from.getTime() + 24 * 60 * 60_000);
  } else if (a === "maine" || a === "mâine") {
    from = new Date(from.getTime() + 24 * 60 * 60_000);
    to = new Date(from.getTime() + 24 * 60 * 60_000);
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(a)) {
    const d = new Date(`${a}T00:00:00`);
    if (!isNaN(d.getTime())) {
      from = d;
      to = new Date(d.getTime() + 24 * 60 * 60_000);
    }
  }

  const list = await prisma.appointment.findMany({
    where: {
      dateTime: { gte: from, lt: to },
      status: { in: ["pending", "confirmed"] },
    },
    orderBy: { dateTime: "asc" },
    include: {
      patient: { select: { name: true, phone: true } },
      service: { select: { title: true } },
    },
    take: 30,
  });

  if (!list.length) return "Nicio programare în intervalul selectat.";

  const STATUS = { pending: "🟡", confirmed: "🟢" } as const;

  return (
    `<b>Programări (${list.length})</b>\n` +
    list
      .map(
        (a) =>
          `${STATUS[a.status as "pending" | "confirmed"] || "⚪️"} ` +
          `${formatDateTimeRo(a.dateTime)} · ` +
          `${a.patient.name} · ${a.service.title}`,
      )
      .join("\n")
  );
}

// ---------- Webhook entrypoint ----------

interface TelegramMessage {
  message_id: number;
  from?: { id: number };
  chat: { id: number };
  text?: string;
  message_thread_id?: number;
}
interface TelegramCallbackQuery {
  id: string;
  from: { id: number };
  message?: {
    message_id: number;
    chat: { id: number };
    text?: string;
    message_thread_id?: number;
  };
  data?: string;
}
interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  edited_message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

export async function POST(request: Request, { params }: RouteParams) {
  const { secret } = await params;

  // Path-segment secret guard
  if (!WEBHOOK_SECRET || secret !== WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let update: TelegramUpdate;
  try {
    update = (await request.json()) as TelegramUpdate;
  } catch {
    return NextResponse.json({ ok: true }); // ignore bad payloads
  }

  // ---------- callback_query (inline button presses) ----------
  if (update.callback_query) {
    const cq = update.callback_query;
    const data = cq.data || "";
    const chatId = String(cq.message?.chat.id ?? "");
    const threadId = cq.message?.message_thread_id;

    // ---- Menu / wizard button presses ----
    if (data.startsWith("menu:") || data.startsWith("wiz:")) {
      try {
        let feedback = "";
        if (data === "menu:pacienti_vezi") {
          await startCautaPacient(chatId, threadId);
        } else if (data === "wiz:pacienti_all" || data === "menu:pacienti_toti") {
          await showAllPacienti(threadId);
        } else if (data === "menu:pacient_nou") {
          await startPacientNou(chatId, threadId);
        } else if (data === "menu:programari_vezi") {
          await showProgramariList(threadId);
        } else if (data === "menu:programare_noua") {
          await startProgramareNoua(chatId, threadId);
        } else {
          feedback = await handleWizardCallback(chatId, data, cq.message?.message_id);
        }
        await answerCallbackQuery(cq.id, feedback);
      } catch (err) {
        console.error("Wizard callback error:", err);
        await answerCallbackQuery(cq.id, "❌ Eroare.");
      }
      return NextResponse.json({ ok: true });
    }

    // ---- "Arată din nou" on the Azi/Mâine digest ----
    if (data.startsWith("digest:")) {
      const key = data.slice("digest:".length) as DigestKey;
      try {
        await refreshDayDigest(key);
        await answerCallbackQuery(cq.id, "Actualizat.");
      } catch (err) {
        console.error("Digest refresh error:", err);
        await answerCallbackQuery(cq.id, "❌ Eroare.");
      }
      return NextResponse.json({ ok: true });
    }

    const match = data.match(/^status:(.+):(.+)$/);

    if (match) {
      const [, apptId, newStatus] = match;
      const validStatuses = ["pending", "confirmed", "completed", "cancelled", "noshow"];

      if (!validStatuses.includes(newStatus)) {
        await tgAnswerCallback(cq.id, "Status invalid.");
        return NextResponse.json({ ok: true });
      }

      try {
        const typedStatus = newStatus as AppointmentStatus;
        await prisma.appointment.update({
          where: { id: apptId },
          data: { status: typedStatus },
        });

        // Freeing the hour is what the admin panel does for these two, and it
        // has to happen here too — otherwise a doctor marking "nu a venit"
        // from the phone leaves the slot reserved and nobody can be booked
        // into it.
        if (newStatus === "cancelled" || newStatus === "noshow") {
          const { releaseSlotByAppointment } = await import("@/lib/slots");
          await releaseSlotByAppointment(apptId);
        }

        // Fetch full appointment for notifications
        const apptFull = await prisma.appointment.findUnique({
          where: { id: apptId },
          include: { patient: true, service: true },
        });
        if (!apptFull) throw new Error("Appointment not found");

        // Fire notification
        const { notifyConfirmed, notifyCancelled, notifyCompleted, notifyNoshow, notifyPending } =
          await import("@/lib/notifications");
        if (newStatus === "confirmed") await notifyConfirmed(apptFull);
        else if (newStatus === "cancelled") await notifyCancelled(apptFull);
        else if (newStatus === "completed") await notifyCompleted(apptFull);
        else if (newStatus === "noshow") await notifyNoshow(apptFull);
        else if (newStatus === "pending") await notifyPending(apptFull);

        await tgAnswerCallback(cq.id, `${STATUS_EMOJI[newStatus]} ${STATUS_LABELS[newStatus]}`);

        // Edit the original message to reflect new status
        if (cq.message) {
          const time = new Date(apptFull.dateTime).toLocaleTimeString("ro-RO", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "Europe/Chisinau",
          });
          const newText =
            `${STATUS_EMOJI[newStatus]} <b>${time}</b> — ${apptFull.patient.name}\n` +
            `🦷 ${apptFull.service.title} · ${apptFull.duration} min\n` +
            `📞 ${apptFull.patient.phone}\n` +
            `<i>Status: ${STATUS_LABELS[newStatus]}</i>`;
          await tgEditMessage(cq.message.chat.id, cq.message.message_id, newText);
        }
      } catch (err) {
        console.error("Callback status update error:", err);
        await tgAnswerCallback(cq.id, "❌ Eroare la actualizare.");
      }
    } else {
      await tgAnswerCallback(cq.id, "");
    }

    return NextResponse.json({ ok: true });
  }

  const msg = update.message || update.edited_message;
  if (!msg || !msg.text) return NextResponse.json({ ok: true });

  // ---- Connecting a chat to an admin account ----
  // Deliberately ahead of the access check: an unconnected chat is exactly
  // what this handles, so the check below would turn every attempt away.
  const incoming = msg.text.trim();
  if (incoming.startsWith("/start ")) {
    const code = incoming.slice("/start ".length).trim();
    if (code) {
      const { consumeTelegramLink } = await import("@/lib/telegram-link");
      await tgSend(msg.chat.id, await consumeTelegramLink(code, String(msg.chat.id)));
      return NextResponse.json({ ok: true });
    }
  }

  // Restrict to admin chat(s) — group AND private chat of the admin
  const ALLOWED = [String(ADMIN_CHAT_ID), process.env.TELEGRAM_ADMIN_USER_ID || ""].filter(Boolean);
  if (ALLOWED.length && !ALLOWED.includes(String(msg.chat.id))) {
    // A connected doctor is not an intruder — they simply have no business
    // driving the clinic-wide commands. Telling them "access denied" for a
    // chat that works perfectly well for their own notifications would only
    // send them asking why.
    const linked = await prisma.adminUser.findFirst({
      where: { telegramId: String(msg.chat.id), isActive: true },
      select: { name: true },
    });

    await tgSend(
      msg.chat.id,
      linked
        ? `Bună ziua, ${linked.name}. Contul dumneavoastră este conectat — ` +
            "aici primiți programările proprii și lista de dimineață.\n\n" +
            "Comenzile clinicii se dau din grupul comun, nu de aici."
        : "⛔ Acest bot răspunde doar echipei clinicii.\n\n" +
            "Dacă aveți cont în panou, deschideți Contul meu și apăsați " +
            "„Conectează Telegram” — linkul de acolo vă conectează automat.",
    );
    return NextResponse.json({ ok: true });
  }

  const text = msg.text.trim();
  const chatId = String(msg.chat.id);
  const threadId = msg.message_thread_id;

  // ---- Persistent reply-keyboard button taps (checked first — restarts any active wizard) ----
  const keyboardHandled = await handleReplyKeyboardButton(chatId, text, threadId, msg.message_id);
  if (keyboardHandled) return NextResponse.json({ ok: true });

  // ---- Active wizard (Pacient nou / Programare nouă) takes priority over slash commands ----
  if (!text.startsWith("/")) {
    const handled = await handleWizardMessage(chatId, text, msg.message_id);
    if (handled) return NextResponse.json({ ok: true });
  }

  const match = text.match(/^\/(\w+)(?:@\w+)?\s*([\s\S]*)$/);
  if (!match) return NextResponse.json({ ok: true });

  const cmd = match[1].toLowerCase();
  const rest = match[2] || "";

  let reply = "";
  try {
    switch (cmd) {
      case "start":
      case "help":
        reply = HELP;
        break;
      case "menu":
        if (threadId === TELEGRAM_TOPICS.pacienti) {
          const m = await sendTelegramMessage(MENU_PACIENTI.text, {
            threadId,
            replyMarkup: MENU_PACIENTI.keyboard,
          });
          await pinTelegramMessage(m.message_id);
        } else if (threadId === TELEGRAM_TOPICS.programariNoi) {
          const m = await sendTelegramMessage(MENU_PROGRAMARI.text, {
            threadId,
            replyMarkup: MENU_PROGRAMARI.keyboard,
          });
          await pinTelegramMessage(m.message_id);
        } else {
          const m1 = await sendTelegramMessage(MENU_PACIENTI.text, {
            threadId: TELEGRAM_TOPICS.pacienti,
            replyMarkup: MENU_PACIENTI.keyboard,
          });
          await pinTelegramMessage(m1.message_id);
          const m2 = await sendTelegramMessage(MENU_PROGRAMARI.text, {
            threadId: TELEGRAM_TOPICS.programariNoi,
            replyMarkup: MENU_PROGRAMARI.keyboard,
          });
          await pinTelegramMessage(m2.message_id);
        }
        // (Re-)establish the persistent reply keyboard — always in General, regardless
        // of which topic /menu was typed in, since the keyboard itself is chat-wide.
        await sendTelegramMessage("⌨️ Tastatură rapidă activă.", {
          replyMarkup: REPLY_KEYBOARD,
        });
        return NextResponse.json({ ok: true });
      case "servicii":
        reply = await cmdServicii();
        break;
      case "pacienti":
        reply = await cmdPacienti(rest);
        break;
      case "pacient_nou":
        reply = await cmdPacientNou(rest);
        break;
      case "programare_noua":
        reply = await cmdProgramareNoua(rest);
        break;
      case "programari":
        reply = await cmdProgramari(rest);
        break;
      default:
        reply = `Comandă necunoscută: /${cmd}\nFolosește /help.`;
    }
  } catch (err) {
    console.error("Telegram cmd error:", err);
    reply = `❌ Eroare server: ${err instanceof Error ? err.message : "necunoscută"}`;
  }

  await tgSend(msg.chat.id, reply, threadId);
  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ ok: true, info: "Telegram webhook endpoint" });
}
