// =============================================
// What a doctor is told, privately.
//
// The clinic group already gets every booking. A doctor should not have to
// read all of it to find their own, so these go to their personal Telegram
// chat — the id saved on their admin account.
//
// Two moments: the booking arrives, and the morning of the day it happens.
// The morning message carries the same status buttons as the evening
// reminder, so marking "finalizat" from a phone still triggers the review
// request on WhatsApp.
// =============================================

import prisma from "@/lib/prisma";
import { sendTelegramToChat } from "@/lib/telegram";
import { getMoldovaDayRangeUTC } from "@/lib/appointments";

const DAY_NAMES = [
  "duminică",
  "luni",
  "marți",
  "miercuri",
  "joi",
  "vineri",
  "sâmbătă",
];

function moldovaTime(date: Date): string {
  return new Intl.DateTimeFormat("ro-RO", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Chisinau",
  }).format(date);
}

function moldovaDay(date: Date): string {
  const weekday = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    timeZone: "Europe/Chisinau",
  }).format(date);
  const index = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ].indexOf(weekday);
  const rest = new Intl.DateTimeFormat("ro-RO", {
    day: "numeric",
    month: "long",
    timeZone: "Europe/Chisinau",
  }).format(date);
  return `${DAY_NAMES[index] ?? ""} ${rest}`.trim();
}

/** The status buttons, identical to the ones on the evening reminder. */
function statusButtons(appointmentId: string) {
  return {
    inline_keyboard: [
      [
        { text: "✅ Finalizat", callback_data: `status:${appointmentId}:completed` },
        { text: "👤 Nu a venit", callback_data: `status:${appointmentId}:noshow` },
      ],
      [
        { text: "🟢 Confirmat", callback_data: `status:${appointmentId}:confirmed` },
        { text: "❌ Anulat", callback_data: `status:${appointmentId}:cancelled` },
      ],
    ],
  };
}

/** The doctor's personal chat id, or null if their account has none saved. */
async function chatIdForDoctor(teamMemberId: string): Promise<string | null> {
  const account = await prisma.adminUser.findFirst({
    where: { teamMemberId, isActive: true, telegramId: { not: null } },
    select: { telegramId: true },
  });
  return account?.telegramId ?? null;
}

/**
 * Tells a doctor a patient was booked with them.
 *
 * Silent when the appointment has no doctor, or the doctor has no Telegram id
 * saved — the clinic group has already been told either way, so nothing is
 * lost, and a missing id must not break the booking that triggered this.
 */
export async function notifyDoctorNewAppointment(appointmentId: string): Promise<void> {
  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: { select: { name: true, phone: true } },
        service: { select: { title: true } },
      },
    });
    if (!appointment?.teamMemberId) return;

    const chatId = await chatIdForDoctor(appointment.teamMemberId);
    if (!chatId) return;

    await sendTelegramToChat(
      chatId,
      [
        "🗓 <b>Pacient nou programat la dumneavoastră</b>",
        "",
        `📅 ${moldovaDay(appointment.dateTime)}, ora <b>${moldovaTime(appointment.dateTime)}</b>`,
        `👤 ${appointment.patient.name}`,
        `📞 ${appointment.patient.phone}`,
        `🦷 ${appointment.service.title} · ${appointment.duration} min`,
        ...(appointment.notes ? ["", `📝 ${appointment.notes}`] : []),
      ].join("\n"),
    );
  } catch (error) {
    console.error("notifyDoctorNewAppointment failed:", error);
  }
}

/**
 * The morning list: today's patients, one message each, with status buttons.
 *
 * Only doctors who have both a Telegram id and patients today hear anything.
 * Appointments already settled — cancelled, or marked done yesterday — are
 * left out; there is nothing to press on those.
 */
export async function sendDoctorMorningBriefings(): Promise<{ doctors: number; sent: number }> {
  const { fromUTC, toUTC } = getMoldovaDayRangeUTC();

  const appointments = await prisma.appointment.findMany({
    where: {
      dateTime: { gte: fromUTC, lte: toUTC },
      status: { in: ["pending", "confirmed"] },
      teamMemberId: { not: null },
    },
    orderBy: { dateTime: "asc" },
    include: {
      patient: { select: { name: true, phone: true } },
      service: { select: { title: true } },
    },
  });

  const byDoctor = new Map<string, typeof appointments>();
  for (const appointment of appointments) {
    const key = appointment.teamMemberId as string;
    byDoctor.set(key, [...(byDoctor.get(key) ?? []), appointment]);
  }

  let doctors = 0;
  let sent = 0;

  for (const [teamMemberId, list] of byDoctor) {
    const chatId = await chatIdForDoctor(teamMemberId);
    if (!chatId) continue;
    doctors++;

    try {
      await sendTelegramToChat(
        chatId,
        [
          `☀️ <b>Programările de azi</b> — ${moldovaDay(list[0].dateTime)}`,
          `${list.length} ${list.length === 1 ? "pacient" : "pacienți"}.`,
          "",
          "<i>După fiecare pacient apăsați butonul potrivit. „Finalizat” trimite automat cererea de recenzie pe WhatsApp.</i>",
        ].join("\n"),
      );

      for (const appointment of list) {
        await sendTelegramToChat(
          chatId,
          [
            `🕐 <b>${moldovaTime(appointment.dateTime)}</b> — ${appointment.patient.name}`,
            `🦷 ${appointment.service.title} · ${appointment.duration} min`,
            `📞 ${appointment.patient.phone}`,
          ].join("\n"),
          { replyMarkup: statusButtons(appointment.id) },
        );
        sent++;
      }
    } catch (error) {
      console.error(`Morning briefing for doctor ${teamMemberId} failed:`, error);
    }
  }

  return { doctors, sent };
}
