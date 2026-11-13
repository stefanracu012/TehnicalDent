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

/** "{teamMemberId}|{YYYY-MM-DD}T{HH}" — one doctor, one hour of one day. */
export function slotKeyFor(teamMemberId: string, date: string, hour: number): string {
  return `${teamMemberId}|${date}T${String(hour).padStart(2, "0")}`;
}

export function buildSlotKey(teamMemberId: string, dateTime: Date): string {
  return slotKeyFor(teamMemberId, getMoldovaDateStr(dateTime), moldovaHour(dateTime));
}

export class SlotTakenError extends Error {
  constructor(message = "Acest interval tocmai a fost rezervat de altcineva. Alegeți altă oră.") {
    super(message);
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

/** The statuses whose hour goes back to the calendar. */
const RELEASES_HOUR = new Set(["cancelled", "noshow"]);
/** The statuses an appointment is set to when it is going ahead. */
const HOLDS_HOUR = new Set(["pending", "confirmed"]);

/**
 * Makes sure an appointment being set to pending or confirmed holds its hour.
 *
 * Cancelling releases the reservation, and confirming again used to leave it
 * released: the hour showed as free to the assistant and in the booking form,
 * and on 13 November the assistant booked a second patient on top of one
 * reception had just confirmed again. Appointments confirmed again before this
 * fix are mended the next time someone confirms them.
 *
 * Call it before changing the status. It throws SlotTakenError, naming who
 * holds the hour now, so the caller refuses instead of double-booking.
 */
export async function reclaimSlotOnReactivate(
  appointment: { id: string; teamMemberId: string | null; dateTime: Date },
  nextStatus: string,
): Promise<void> {
  if (!appointment.teamMemberId || !HOLDS_HOUR.has(nextStatus)) return;

  const slotKey = buildSlotKey(appointment.teamMemberId, appointment.dateTime);
  // A reservation under another hour would block this one: appointmentId is unique.
  await prisma.appointmentSlot.deleteMany({
    where: { appointmentId: appointment.id, NOT: { slotKey } },
  });

  for (let attempt = 0; attempt < 2; attempt++) {
    const holder = await prisma.appointmentSlot.findUnique({ where: { slotKey } });
    if (holder?.appointmentId === appointment.id) return;
    if (holder) {
      const other = await prisma.appointment.findUnique({
        where: { id: holder.appointmentId },
        select: { status: true, patient: { select: { name: true } } },
      });
      if (other && !RELEASES_HOUR.has(other.status)) {
        throw new SlotTakenError(
          `Ora este ocupată acum de ${other.patient.name}. Mutați una dintre programări la altă oră.`,
        );
      }
      // Left behind by an appointment that no longer holds the hour.
      await prisma.appointmentSlot.deleteMany({ where: { id: holder.id } });
    }
    try {
      await prisma.appointmentSlot.create({ data: { slotKey, appointmentId: appointment.id } });
      return;
    } catch {
      // Taken between the read and the write: look at who has it.
    }
  }
  throw new SlotTakenError();
}

/**
 * The team members who can be booked: active, and seeing patients. The dental
 * technician is on the team but not in the calendar. Every place that looks
 * for a free hour starts from this list, so they cannot disagree.
 */
export async function bookableDoctors() {
  const members = await prisma.teamMember.findMany({
    where: { isActive: true },
    orderBy: { order: "asc" },
    select: { id: true, name: true, role: true, isDoctor: true },
  });
  // Null on rows saved before the field existed: those are doctors.
  return members
    .filter((m) => m.isDoctor !== false)
    .map((m) => ({ id: m.id, name: m.name, role: m.role }));
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

  // Asked for by exact key, one per open hour. This used to be a "starts with"
  // on "{doctor}|{date}T" — but on MongoDB Prisma turns that into an unescaped
  // regular expression, where "|" means "or". It matched every reservation the
  // doctor had on any day, so an hour booked once on any date showed as taken
  // on every date: a doctor who opened 15:00 today could not be booked at
  // 15:00 because of a patient at 15:00 three weeks earlier.
  const keys = availability.hours.map((h) => slotKeyFor(teamMemberId, date, h));
  const taken = await prisma.appointmentSlot.findMany({
    where: { slotKey: { in: keys } },
    select: { slotKey: true },
  });
  const takenKeys = new Set(taken.map((s) => s.slotKey));

  return availability.hours.filter((h) => !takenKeys.has(slotKeyFor(teamMemberId, date, h)));
}
