// =============================================
// Daily Telegram briefing — lista programărilor zilei
// cu butoane inline pentru schimbarea statusului.
// Apelat din cronul de notificări când ora Moldova e 07:25–07:35.
// =============================================

import prisma from "@/lib/prisma";
import { getMoldovaDayRangeUTC } from "@/lib/appointments";

const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const TG_CHAT_ID =
  process.env.TELEGRAM_ADMIN_CHAT_ID || process.env.TELEGRAM_CHAT_ID || "";

const STATUS_EMOJI: Record<string, string> = {
  pending: "🟡",
  confirmed: "🟢",
  completed: "✅",
  cancelled: "❌",
  noshow: "👤",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Așteptare",
  confirmed: "Confirmă",
  completed: "Finalizat",
  cancelled: "Anulează",
  noshow: "Neprezent",
};

async function tgPost(method: string, body: object) {
  await fetch(`https://api.telegram.org/bot${TG_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => {});
}

export async function sendDailyBriefing(): Promise<{ sent: number }> {
  if (!TG_TOKEN || !TG_CHAT_ID) return { sent: 0 };

  const now = new Date();
  const { fromUTC, toUTC } = getMoldovaDayRangeUTC(now);

  const appts = await prisma.appointment.findMany({
    where: {
      dateTime: { gte: fromUTC, lte: toUTC },
      status: { notIn: ["cancelled"] },
    },
    orderBy: { dateTime: "asc" },
    include: {
      patient: { select: { name: true, phone: true } },
      service: { select: { title: true } },
    },
  });

  const dateLabel = now.toLocaleDateString("ro-RO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Europe/Chisinau",
  });

  if (appts.length === 0) {
    await tgPost("sendMessage", {
      chat_id: TG_CHAT_ID,
      parse_mode: "HTML",
      text: `📅 <b>Programări ${dateLabel}</b>\n\nNicio programare pentru azi. 🎉`,
    });
    return { sent: 0 };
  }

  // Mesaj header
  await tgPost("sendMessage", {
    chat_id: TG_CHAT_ID,
    parse_mode: "HTML",
    text: `📅 <b>Programări ${dateLabel}</b> — ${appts.length} pacient${appts.length !== 1 ? "i" : ""}`,
  });

  // Un mesaj per programare cu butoane inline
  const ALL_STATUSES = ["pending", "confirmed", "completed", "cancelled", "noshow"] as const;

  for (const appt of appts) {
    const time = new Date(appt.dateTime).toLocaleTimeString("ro-RO", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Chisinau",
    });

    const text =
      `${STATUS_EMOJI[appt.status] ?? "⚪"} <b>${time}</b> — ${appt.patient.name}\n` +
      `🦷 ${appt.service.title} · ${appt.duration} min\n` +
      `📞 ${appt.patient.phone}`;

    const buttons = ALL_STATUSES.filter((s) => s !== appt.status).map((s) => ({
      text: `${STATUS_EMOJI[s]} ${STATUS_LABELS[s]}`,
      callback_data: `status:${appt.id}:${s}`,
    }));

    // Max 3 butoane pe primul rând, restul pe al doilea
    const inline_keyboard = [buttons.slice(0, 3), buttons.slice(3)].filter(
      (row) => row.length > 0,
    );

    await tgPost("sendMessage", {
      chat_id: TG_CHAT_ID,
      parse_mode: "HTML",
      text,
      reply_markup: { inline_keyboard },
    });
  }

  return { sent: appts.length };
}

export async function sendEveningReminder(): Promise<{ sent: number }> {
  if (!TG_TOKEN || !TG_CHAT_ID) return { sent: 0 };

  const { fromUTC, toUTC } = getMoldovaDayRangeUTC();

  // Doar programările nerezolvate (pending sau confirmed)
  const appts = await prisma.appointment.findMany({
    where: {
      dateTime: { gte: fromUTC, lte: toUTC },
      status: { in: ["pending", "confirmed"] },
    },
    orderBy: { dateTime: "asc" },
    include: {
      patient: { select: { name: true, phone: true } },
      service: { select: { title: true } },
    },
  });

  if (appts.length === 0) return { sent: 0 };

  const ALL_STATUSES = ["pending", "confirmed", "completed", "cancelled", "noshow"] as const;

  await tgPost("sendMessage", {
    chat_id: TG_CHAT_ID,
    parse_mode: "HTML",
    text:
      `⚠️ <b>Programări nefinalizate azi</b> — ${appts.length} pacient${appts.length !== 1 ? "i" : ""} fără status final\n` +
      `<i>Te rugăm să marchezi statusul fiecăruia.</i>`,
  });

  for (const appt of appts) {
    const time = new Date(appt.dateTime).toLocaleTimeString("ro-RO", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Chisinau",
    });

    const text =
      `${STATUS_EMOJI[appt.status] ?? "⚪"} <b>${time}</b> — ${appt.patient.name}\n` +
      `🦷 ${appt.service.title} · ${appt.duration} min\n` +
      `📞 ${appt.patient.phone}`;

    const buttons = ALL_STATUSES.filter((s) => s !== appt.status).map((s) => ({
      text: `${STATUS_EMOJI[s]} ${STATUS_LABELS[s]}`,
      callback_data: `status:${appt.id}:${s}`,
    }));

    const inline_keyboard = [buttons.slice(0, 3), buttons.slice(3)].filter(
      (row) => row.length > 0,
    );

    await tgPost("sendMessage", {
      chat_id: TG_CHAT_ID,
      parse_mode: "HTML",
      text,
      reply_markup: { inline_keyboard },
    });
  }

  return { sent: appts.length };
}
