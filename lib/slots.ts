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
