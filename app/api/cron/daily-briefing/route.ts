import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

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

async function sendDailyBriefing() {
  if (!TG_TOKEN || !TG_CHAT_ID) {
    throw new Error("Telegram not configured");
  }

  // Moldova is UTC+3; get today's date in Moldova timezone
  const nowMoldova = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Europe/Chisinau" }),
  );
  const from = new Date(nowMoldova);
  from.setHours(0, 0, 0, 0);
  const to = new Date(nowMoldova);
  to.setHours(23, 59, 59, 999);

  // Convert back to UTC for DB query
  const offsetMs = new Date().getTime() - new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Chisinau" })).getTime();
  const fromUTC = new Date(from.getTime() + offsetMs);
  const toUTC = new Date(to.getTime() + offsetMs);

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

  const dateLabel = from.toLocaleDateString("ro-RO", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  if (appts.length === 0) {
    await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TG_CHAT_ID,
        parse_mode: "HTML",
        text: `📅 <b>Programări ${dateLabel}</b>\n\nNicio programare pentru azi. 🎉`,
      }),
    });
    return { sent: 0 };
  }

  // Send header message
  await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: TG_CHAT_ID,
      parse_mode: "HTML",
      text: `📅 <b>Programări ${dateLabel}</b> — ${appts.length} pacient${appts.length !== 1 ? "i" : ""}`,
    }),
  });

  // Send one message per appointment with inline buttons
  for (const appt of appts) {
    const time = new Date(appt.dateTime).toLocaleTimeString("ro-RO", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Chisinau",
    });

    const text =
      `${STATUS_EMOJI[appt.status] || "⚪"} <b>${time}</b> — ${appt.patient.name}\n` +
      `🦷 ${appt.service.title} · ${appt.duration} min\n` +
      `📞 ${appt.patient.phone}`;

    // Build inline buttons — all statuses except current
    const ALL_STATUSES = ["pending", "confirmed", "completed", "cancelled", "noshow"] as const;
    const buttons = ALL_STATUSES.filter((s) => s !== appt.status).map((s) => ({
      text: `${STATUS_EMOJI[s]} ${STATUS_LABELS[s]}`,
      callback_data: `status:${appt.id}:${s}`,
    }));

    // Two rows: first 3 buttons, then remaining
    const inline_keyboard = [buttons.slice(0, 3), buttons.slice(3)].filter(
      (row) => row.length > 0,
    );

    await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TG_CHAT_ID,
        parse_mode: "HTML",
        text,
        reply_markup: { inline_keyboard },
      }),
    });
  }

  return { sent: appts.length };
}

async function handle(request: Request) {
  const url = new URL(request.url);
  const expected = process.env.CRON_SECRET || "";

  if (!expected) {
    return NextResponse.json({ error: "CRON_SECRET not set" }, { status: 500 });
  }

  const authHeader = request.headers.get("authorization") || "";
  const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const secretHeader = request.headers.get("x-cron-secret") || "";
  const secretQuery = url.searchParams.get("secret") || "";

  const valid =
    bearerToken === expected || secretHeader === expected || secretQuery === expected;

  if (!valid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await sendDailyBriefing();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("Daily briefing error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed" },
      { status: 500 },
    );
  }
}

export const GET = handle;
export const POST = handle;
