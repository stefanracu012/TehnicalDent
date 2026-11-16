// =============================================
// Booking from the website (/contact).
//
// A visitor picks a service, a doctor and a free time from the doctors' own
// calendars — the same ones reception and the assistant book from — and the
// result is an ordinary appointment: it shows in the admin calendar, is
// announced in the "Programări noi" Telegram topic and to the doctor, and the
// patient gets the WhatsApp message asking them to confirm.
//
// Public, so nothing in here may reveal another patient: errors are codes the
// page translates, and the times offered are only times.
// =============================================

import prisma from "@/lib/prisma";
import {
  checkOverlap,
  formatDateTimeRo,
  generateConfirmToken,
  getMoldovaDateStr,
  parseMoldovaDateTime,
} from "@/lib/appointments";
import { bookableDoctors, claimSlot, clock, freeTimesRange } from "@/lib/slots";
import { captureLead, markLeadBooked, normalisePhone } from "@/lib/leads";
import { notifyCreated } from "@/lib/notifications";
import { getLocalizedField } from "@/lib/localize";

/** How far ahead a visitor can book. */
export const BOOKING_HORIZON_DAYS = 30;
/** Nobody books the next hour from the site: reception has to see it in time. */
const LEAD_TIME_MS = 2 * 3_600_000;
/** Active future appointments one phone number may hold, to stop a number being flooded. */
const MAX_ACTIVE_PER_PHONE = 2;

const OBJECT_ID = /^[0-9a-f]{24}$/i;

export interface BookingService {
  id: string;
  title: string;
  duration: number;
}

export interface BookingDoctor {
  id: string;
  name: string;
  role: string;
}

export interface BookingOptions {
  services: BookingService[];
  doctors: BookingDoctor[];
  /** date → doctor id → start times in minutes since midnight. Only days with something free. */
  days: Record<string, Record<string, number[]>>;
}

/** Whether a service row can be picked on the site. Fields added later are absent on old rows. */
function isBookable(s: { isActive: boolean; bookable?: boolean | null; showOnSite?: boolean | null }): boolean {
  return s.isActive && s.bookable !== false && s.showOnSite !== false;
}

export async function bookingServices(locale: string): Promise<BookingService[]> {
  const rows = await prisma.service.findMany({ orderBy: { order: "asc" } });
  return rows
    .filter(isBookable)
    .map((s) => ({ id: s.id, title: getLocalizedField(s, "title", locale), duration: s.duration || 30 }));
}

/**
 * Everything the booking form needs: the services, the doctors, and for the
 * coming month each doctor's free times — for `serviceId`'s length when given.
 */
export async function bookingOptions(locale: string, serviceId?: string): Promise<BookingOptions> {
  const services = await bookingServices(locale);
  const duration = services.find((s) => s.id === serviceId)?.duration;

  const doctorRows = await bookableDoctors();
  const members = await prisma.teamMember.findMany({ where: { id: { in: doctorRows.map((d) => d.id) } } });
  const doctors: BookingDoctor[] = doctorRows.map((d) => {
    const m = members.find((x) => x.id === d.id);
    return { id: d.id, name: d.name, role: m ? getLocalizedField(m, "role", locale) : d.role };
  });

  const now = new Date();
  const from = getMoldovaDateStr(now, 0);
  const to = getMoldovaDateStr(now, BOOKING_HORIZON_DAYS);
  const free = await freeTimesRange(
    doctors.map((d) => d.id),
    from,
    to,
    { durationMin: duration },
  );

  const days: BookingOptions["days"] = {};
  for (const [doctorId, byDate] of free) {
    for (const [date, times] of byDate) {
      const upcoming = times.filter((t) => {
        const at = parseMoldovaDateTime(`${date}T${clock(t)}`);
        return at !== null && at.getTime() > now.getTime() + LEAD_TIME_MS;
      });
      if (upcoming.length === 0) continue;
      (days[date] ??= {})[doctorId] = upcoming;
    }
  }
  return { services, doctors, days };
}

export type BookingErrorCode =
  | "invalid"
  | "invalid_phone"
  | "invalid_email"
  | "slot_taken"
  | "already_booked"
  | "too_many";

export type BookingResult =
  | { ok: true; id: string; when: string; doctor: string; service: string }
  | { ok: false; status: number; code: BookingErrorCode };

export interface BookingInput {
  serviceId: unknown;
  /** "any" or a doctor id. */
  doctorId: unknown;
  /** "YYYY-MM-DD" */
  date: unknown;
  /** Minutes since midnight. */
  time: unknown;
  name: unknown;
  phone: unknown;
  email?: unknown;
  note?: unknown;
  locale?: string;
}

const fail = (status: number, code: BookingErrorCode): BookingResult => ({ ok: false, status, code });

/** Books the appointment, or says why not. */
export async function createOnlineBooking(input: BookingInput): Promise<BookingResult> {
  const serviceId = String(input.serviceId ?? "");
  const date = String(input.date ?? "");
  const minutes = Number(input.time);
  const name = String(input.name ?? "").trim().replace(/\s+/g, " ");
  const email = String(input.email ?? "").trim();
  const note = String(input.note ?? "").trim().slice(0, 500);
  const doctorWanted = String(input.doctorId ?? "any");

  if (
    !OBJECT_ID.test(serviceId) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isInteger(minutes) ||
    minutes < 0 ||
    minutes >= 24 * 60 ||
    name.length < 2 ||
    name.length > 80 ||
    (doctorWanted !== "any" && !OBJECT_ID.test(doctorWanted))
  ) {
    return fail(400, "invalid");
  }
  const phone = normalisePhone(String(input.phone ?? ""));
  if (!phone) return fail(400, "invalid_phone");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail(400, "invalid_email");

  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service || !isBookable(service)) return fail(400, "invalid");

  const when = parseMoldovaDateTime(`${date}T${clock(minutes)}`);
  const now = Date.now();
  if (!when || when.getTime() < now + LEAD_TIME_MS || date > getMoldovaDateStr(new Date(), BOOKING_HORIZON_DAYS)) {
    return fail(409, "slot_taken");
  }
  const duration = service.duration || 30;

  // The doctor: the one asked for, or the first who has the time free. Checked
  // against the calendar here, not trusted from the page.
  const doctors = await bookableDoctors();
  const candidates = doctorWanted === "any" ? doctors : doctors.filter((d) => d.id === doctorWanted);
  const free = await freeTimesRange(
    candidates.map((d) => d.id),
    date,
    date,
    { durationMin: duration },
  );
  const doctor = candidates.find((d) => free.get(d.id)?.get(date)?.includes(minutes));
  if (!doctor) return fail(409, "slot_taken");

  // The same person, however the number was written when they were added.
  const tail = phone.replace(/\D/g, "").slice(-8);
  const existing =
    (await prisma.patient.findFirst({ where: { phone } })) ??
    (await prisma.patient.findFirst({ where: { phone: { contains: tail } } }));

  if (existing) {
    const active = await prisma.appointment.count({
      where: { patientId: existing.id, dateTime: { gte: new Date() }, status: { in: ["pending", "confirmed"] } },
    });
    if (active >= MAX_ACTIVE_PER_PHONE) return fail(409, "too_many");
  }

  // Another doctor's patient at the same time is fine — the doctors work in
  // parallel — but the same doctor, or the same person twice, is not.
  const overlap = await checkOverlap({
    dateTime: when,
    duration,
    patientId: existing?.id,
    teamMemberId: doctor.id,
  });
  if (overlap.verdict === "blocked") {
    return fail(409, overlap.kind === "patient" ? "already_booked" : "slot_taken");
  }

  // Created only now, once nothing can refuse the booking any more.
  const patient = existing ?? (await prisma.patient.create({ data: { name, phone, email: email || null } }));

  const created = await prisma.appointment.create({
    data: {
      patientId: patient.id,
      serviceId: service.id,
      teamMemberId: doctor.id,
      dateTime: when,
      duration,
      status: "pending",
      notes: [
        "Programare online, de pe site.",
        // A different name on a known number: the clinic should see who it is for.
        ...(patient.name.trim().toLowerCase() !== name.toLowerCase() ? [`Nume scris pe site: ${name}.`] : []),
        ...(note ? [`Pacientul a scris: ${note}`] : []),
      ].join(" "),
    },
    include: { patient: true, service: true },
  });

  try {
    // The unique reservation decides a race between two visitors.
    await claimSlot(doctor.id, when, created.id);
  } catch {
    await prisma.appointment.delete({ where: { id: created.id } });
    return fail(409, "slot_taken");
  }

  await prisma.appointment.update({
    where: { id: created.id },
    data: { confirmToken: generateConfirmToken(created.id) },
  });

  // Awaited: on serverless the work after the response is cut short, and the
  // notifications are the point — the clinic and the patient must hear of it.
  try {
    await notifyCreated(created);
  } catch (error) {
    console.error("online booking: notifyCreated failed:", error);
  }

  // It shows in the leads list as booked, from the form.
  const captured = await captureLead({
    source: "formular",
    reference: `programare-${created.id}`,
    name,
    phone,
    email: email || null,
    message: note || null,
    interest: service.title,
  });
  if (captured) {
    await markLeadBooked({
      phone,
      name,
      patientId: patient.id,
      summary: `${formatDateTimeRo(when)}, ${service.title}`,
      by: "site",
    });
  }

  return {
    ok: true,
    id: created.id,
    when: when.toISOString(),
    doctor: doctor.name,
    service: getLocalizedField(service, "title", input.locale ?? "ro"),
  };
}
