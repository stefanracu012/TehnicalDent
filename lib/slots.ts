// =============================================
// Slot reservation.
//
// Two people booking the same doctor-hour at the same moment must not both
// succeed. Rather than "check then write" — which races, because both
// requests can pass the check before either writes — a reservation row with
// a unique slotKey is created first. The database index is what actually
// decides the winner; the loser gets a duplicate-key error.
// =============================================

import prisma from "@/lib/prisma";
import { getMoldovaDateStr } from "@/lib/appointments";

/** Hour of a Date as seen in Moldova, 0–23. */
export function moldovaHour(date: Date): number {
  return Number(
    new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      hour12: false,
      timeZone: "Europe/Chisinau",
    }).format(date),
  );
}

export function buildSlotKey(teamMemberId: string, dateTime: Date): string {
  return `${teamMemberId}|${getMoldovaDateStr(dateTime)}T${String(
    moldovaHour(dateTime),
  ).padStart(2, "0")}`;
}

export class SlotTakenError extends Error {
  constructor() {
    super("Acest interval tocmai a fost rezervat de altcineva. Alegeți altă oră.");
    this.name = "SlotTakenError";
  }
}

export class DoctorUnavailableError extends Error {
  constructor() {
    super("Doctorul nu este disponibil la această oră.");
    this.name = "DoctorUnavailableError";
  }
}

/**
 * Claims the slot for a doctor, throwing if it's taken or outside their
 * declared availability. Returns the reservation id so the caller can
 * release it if creating the appointment then fails.
 */
export async function claimSlot(
  teamMemberId: string,
  dateTime: Date,
  appointmentId: string,
): Promise<string> {
  const date = getMoldovaDateStr(dateTime);
  const hour = moldovaHour(dateTime);

  const availability = await prisma.doctorAvailability.findUnique({
    where: { teamMemberId_date: { teamMemberId, date } },
  });
  if (!availability?.hours.includes(hour)) {
    throw new DoctorUnavailableError();
  }

  try {
    const slot = await prisma.appointmentSlot.create({
      data: { slotKey: buildSlotKey(teamMemberId, dateTime), appointmentId },
    });
    return slot.id;
  } catch {
    // Unique violation — someone else won the race.
    throw new SlotTakenError();
  }
}

export async function releaseSlotByAppointment(appointmentId: string): Promise<void> {
  await prisma.appointmentSlot.deleteMany({ where: { appointmentId } });
}

/** Hours a doctor still has free on a given Moldova date. */
export async function freeHours(
  teamMemberId: string,
  date: string,
): Promise<number[]> {
  const availability = await prisma.doctorAvailability.findUnique({
    where: { teamMemberId_date: { teamMemberId, date } },
  });
  if (!availability) return [];

  const taken = await prisma.appointmentSlot.findMany({
    where: { slotKey: { startsWith: `${teamMemberId}|${date}T` } },
    select: { slotKey: true },
  });
  const takenHours = new Set(
    taken.map((s) => Number(s.slotKey.split("T")[1])),
  );

  return availability.hours.filter((h) => !takenHours.has(h));
}
