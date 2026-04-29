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
  });
}
