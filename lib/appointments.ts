// =============================================
// Booking module — shared helpers
// Overlap detection, signed token generation,
// validation utilities.
// =============================================

import crypto from "crypto";
import prisma from "@/lib/prisma";
import type { AppointmentStatus } from "@prisma/client";

const TOKEN_SECRET =
  process.env.APPOINTMENT_TOKEN_SECRET ||
  process.env.ADMIN_SESSION_SECRET ||
  "fallback-secret-change-me";

// ---- Phone normalization (RO + intl) ----

/**
 * Normalises a phone string to a comparable canonical form.
 * Strips spaces, dashes, parentheses; keeps leading +.
 */
export function normalizePhone(raw: string): string {
  if (!raw) return "";
  const cleaned = raw.replace(/[^\d+]/g, "");
  // Strip duplicate +
  if (cleaned.startsWith("++")) return "+" + cleaned.replace(/^\++/, "");
  return cleaned;
}

export function isValidPhone(raw: string): boolean {
  const norm = normalizePhone(raw);
  // Min 7 digits, max 15 (E.164)
  const digits = norm.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15;
}

/**
 * Converts a stored patient phone (often entered in local Moldovan format,
 * e.g. "068046719") into the full MSISDN WhatsApp's Cloud API requires
 * (no '+', no leading 0, e.g. "37368046719"). Numbers already in
 * international form (with '+373...' or '373...') pass through unchanged.
 * Assumes Moldova as the default country — this clinic has no other market.
 */
export function toWhatsAppPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("373")) return digits;
  if (digits.startsWith("0")) return "373" + digits.slice(1);
  return digits;
}

// ---- ISO datetime parsing ----

export function parseDateTime(input: unknown): Date | null {
  if (input instanceof Date) return isNaN(input.getTime()) ? null : input;
  if (typeof input !== "string") return null;
  const d = new Date(input);
  return isNaN(d.getTime()) ? null : d;
}

// ---- Overlap detection ----

interface OverlapCheckParams {
  dateTime: Date;
  duration: number; // minutes
  excludeId?: string; // when editing
}

const ACTIVE_STATUSES: AppointmentStatus[] = ["pending", "confirmed"];

/**
 * Returns the first overlapping appointment, if any.
 * Two appointments overlap when [start, end) intervals intersect.
 */
export async function findOverlappingAppointment({
  dateTime,
  duration,
  excludeId,
}: OverlapCheckParams) {
  const start = dateTime;
  const end = new Date(start.getTime() + duration * 60_000);

  // We fetch a small window of candidates around the slot
  // (anything that starts within ±8h of the new slot) and check intersection
  // in JS — avoids the need for an aggregation pipeline.
  const windowStart = new Date(start.getTime() - 8 * 60 * 60_000);
  const windowEnd = new Date(end.getTime() + 8 * 60 * 60_000);

  const candidates = await prisma.appointment.findMany({
    where: {
      dateTime: { gte: windowStart, lte: windowEnd },
      status: { in: ACTIVE_STATUSES },
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
    select: { id: true, dateTime: true, duration: true, patientId: true, serviceId: true },
  });

  for (const c of candidates) {
    const cStart = c.dateTime;
    const cEnd = new Date(cStart.getTime() + (c.duration || 30) * 60_000);
    // overlap if cStart < end AND cEnd > start
    if (cStart < end && cEnd > start) return c;
  }
  return null;
}

// ---- Signed token for public confirm/cancel links ----

/**
 * Creates a deterministic HMAC token for an appointment.
 * Stored hashed in DB; raw token sent in email/Viber link.
 */
export function generateConfirmToken(appointmentId: string): string {
  return crypto
    .createHmac("sha256", TOKEN_SECRET)
    .update(appointmentId)
    .digest("hex")
    .slice(0, 40);
}

export function verifyConfirmToken(
  appointmentId: string,
  token: string,
): boolean {
  if (!token || token.length !== 40) return false;
  const expected = generateConfirmToken(appointmentId);
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(token));
  } catch {
    return false;
  }
}

// ---- Public-facing URLs ----

export function buildConfirmUrl(appointmentId: string): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://tehnicaldent.md";
  const token = generateConfirmToken(appointmentId);
  return `${base}/programare/${appointmentId}?token=${token}`;
}

// ---- Date formatting (RO) ----

export function formatDateTimeRo(d: Date): string {
  return d.toLocaleString("ro-RO", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Chisinau",
  });
}

// ---- Moldova day-boundary helper (server-timezone independent) ----

const MOLDOVA_TZ = "Europe/Chisinau";

/**
 * Returns Moldova's current UTC offset in ms (e.g. +3h in summer/EEST,
 * +2h in winter/EET) for the given instant, via Intl — never depends on
 * the runtime's own default timezone (unlike parsing a toLocaleString()
 * result back through `new Date(...)`, which silently breaks if the
 * server's default TZ isn't UTC).
 */
function moldovaOffsetMs(reference: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: MOLDOVA_TZ,
    timeZoneName: "shortOffset",
  }).formatToParts(reference);
  const tzName = parts.find((p) => p.type === "timeZoneName")?.value || "GMT+0";
  const hours = parseInt(tzName.replace("GMT", ""), 10) || 0;
  return hours * 60 * 60_000;
}

/**
 * Returns the [00:00, 23:59:59.999] range of "today in Moldova" as real UTC
 * instants — safe to use directly in Prisma date-range queries regardless
 * of what timezone the server process itself runs in.
 */
export function getMoldovaDayRangeUTC(reference: Date = new Date()): {
  fromUTC: Date;
  toUTC: Date;
} {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: MOLDOVA_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(reference);
  const get = (type: string) => parts.find((p) => p.type === type)?.value || "0";
  const year = parseInt(get("year"), 10);
  const month = parseInt(get("month"), 10);
  const day = parseInt(get("day"), 10);
  const offset = moldovaOffsetMs(reference);

  return {
    fromUTC: new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0) - offset),
    toUTC: new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999) - offset),
  };
}
