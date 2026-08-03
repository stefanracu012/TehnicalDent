// =============================================
// "Azi" / "Mâine" Telegram forum topics — a live, self-replacing digest
// of the day's appointments (one card per appointment, inline status
// buttons), instead of a one-off morning briefing. Call refreshDayDigest()
// whenever an appointment affecting today/tomorrow changes; the cron also
// calls it once as a safety net when the calendar day rolls over.
// =============================================

import prisma from "@/lib/prisma";
import { getMoldovaDayRangeUTC, getMoldovaDateStr } from "@/lib/appointments";
import { sendTelegramMessage, deleteTelegramMessage, TELEGRAM_TOPICS } from "@/lib/telegram";

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

const ALL_STATUSES = ["pending", "confirmed", "completed", "cancelled", "noshow"] as const;

export type DigestKey = "azi" | "maine";

const DIGEST_LABEL: Record<DigestKey, string> = { azi: "Azi", maine: "Mâine" };
const DIGEST_OFFSET: Record<DigestKey, number> = { azi: 0, maine: 1 };

/**
 * Rebuilds the "Azi"/"Mâine" topic: deletes every message this digest
 * posted last time, then posts a fresh header + one card per appointment
 * (with inline status buttons, same callback_data the Telegram webhook's
 * status-change handler already understands).
 */
export async function refreshDayDigest(key: DigestKey): Promise<void> {
  const threadId = TELEGRAM_TOPICS[key];
  if (!threadId) return; // topic not created/configured — nothing to do

  const now = new Date();
  const dayOffset = DIGEST_OFFSET[key];
  const { fromUTC, toUTC } = getMoldovaDayRangeUTC(now, dayOffset);
  const dateStr = getMoldovaDateStr(now, dayOffset);
  const label = DIGEST_LABEL[key];

  const appts = await prisma.appointment.findMany({
    where: { dateTime: { gte: fromUTC, lte: toUTC }, status: { notIn: ["cancelled", "test"] } },
    orderBy: { dateTime: "asc" },
    include: {
      patient: { select: { name: true, phone: true } },
      service: { select: { title: true } },
    },
  });

  const existing = await prisma.topicDigest.findUnique({ where: { key } });
  if (existing) {
    for (const id of existing.messageIds) {
      await deleteTelegramMessage(id);
    }
  }

  const newIds: number[] = [];
  const refreshButton = {
    inline_keyboard: [[{ text: "🔄 Arată din nou", callback_data: `digest:${key}` }]],
  };

  if (appts.length === 0) {
    const msg = await sendTelegramMessage(`📅 <b>${label}</b>\n\nNicio programare.`, {
      threadId,
      replyMarkup: refreshButton,
    });
    newIds.push(msg.message_id);
  } else {
    const header = await sendTelegramMessage(
      `📅 <b>${label}</b> — ${appts.length} programare${appts.length !== 1 ? "ri" : ""}`,
      { threadId, replyMarkup: refreshButton },
    );
    newIds.push(header.message_id);

    for (const appt of appts) {
      const time = appt.dateTime.toLocaleTimeString("ro-RO", {
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

      const msg = await sendTelegramMessage(text, { threadId, replyMarkup: { inline_keyboard } });
      newIds.push(msg.message_id);
    }
  }

  await prisma.topicDigest.upsert({
    where: { key },
    create: { key, dateStr, messageIds: newIds },
    update: { dateStr, messageIds: newIds },
  });
}

/** Refreshes "azi"/"maine" only if `appointmentDate` actually falls on that day. */
export async function refreshDigestIfRelevant(appointmentDate: Date): Promise<void> {
  const now = new Date();
  const todayStr = getMoldovaDateStr(now, 0);
  const tomorrowStr = getMoldovaDateStr(now, 1);
  const apptDayStr = getMoldovaDateStr(appointmentDate, 0);

  if (apptDayStr === todayStr) await refreshDayDigest("azi");
  else if (apptDayStr === tomorrowStr) await refreshDayDigest("maine");
}

/** Cron safety net: rebuild any digest whose stored date has gone stale (day rollover). */
export async function refreshStaleDigests(): Promise<void> {
  const now = new Date();
  for (const key of ["azi", "maine"] as DigestKey[]) {
    if (!TELEGRAM_TOPICS[key]) continue;
    const expected = getMoldovaDateStr(now, DIGEST_OFFSET[key]);
    const existing = await prisma.topicDigest.findUnique({ where: { key } });
    if (!existing || existing.dateStr !== expected) {
      await refreshDayDigest(key);
    }
  }
}
