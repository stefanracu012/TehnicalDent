// =============================================
// Clinic time: every hour in the panel is Chișinău time, not the computer's.
//
// Without this, a laptop on another time zone sends a different hour from the
// one picked on screen, and reminders arrive shifted. All conversions go
// through Intl, so summer time is handled. Safe in the browser and on the
// server alike — no Node or Prisma imports here.
// =============================================

export const CLINIC_TZ = "Europe/Chisinau";

const pad = (n: number | string) => String(n).padStart(2, "0");

/** How many minutes Chișinău is ahead of UTC at a moment (180 in summer). */
export function tzOffsetMinutes(date: Date): number {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: CLINIC_TZ,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
      .formatToParts(date)
      .map((x) => [x.type, x.value]),
  );
  const asUtc = Date.UTC(
    Number(p.year),
    Number(p.month) - 1,
    Number(p.day),
    Number(p.hour === "24" ? "0" : p.hour),
    Number(p.minute),
    Number(p.second),
  );
  return Math.round((asUtc - date.getTime()) / 60000);
}

/** "2026-10-14" + 15 + 30, read as Chișinău time → ISO in UTC, for the API. */
export function clinicToIso(date: string, hour: number | string, minute: number | string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const naive = new Date(`${date}T${pad(hour)}:${pad(minute)}:00Z`);
  if (Number.isNaN(naive.getTime())) return null;

  const offset = tzOffsetMinutes(naive);
  const utc = new Date(naive.getTime() - offset * 60000);
  // Near the clock change the offset can differ before and after converting.
  const corrected = tzOffsetMinutes(utc);
  return corrected === offset
    ? utc.toISOString()
    : new Date(naive.getTime() - corrected * 60000).toISOString();
}

/** A stored moment → { date: "YYYY-MM-DD", hour: "HH", minute: "MM" } in Chișinău. */
export function clinicParts(value: string | Date | null | undefined) {
  const d = value ? new Date(value) : null;
  if (!d || Number.isNaN(d.getTime())) return { date: "", hour: "10", minute: "00" };
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: CLINIC_TZ,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
      .formatToParts(d)
      .map((x) => [x.type, x.value]),
  );
  return {
    date: `${p.year}-${p.month}-${p.day}`,
    hour: p.hour === "24" ? "00" : p.hour,
    minute: p.minute,
  };
}

/** Days from today, at a given hour — for the "+3 zile" shortcuts. */
export function clinicInDays(days: number, hour = 10, minute = 0): string | null {
  const { date } = clinicParts(new Date(Date.now() + days * 86_400_000));
  return clinicToIso(date, hour, minute);
}

/** The start of a Chișinău day, as a moment. `days` moves it forward or back. */
export function clinicDayStart(days = 0, from = new Date()): Date {
  const { date } = clinicParts(from);
  const [y, m, d] = date.split("-").map(Number);
  const shifted = new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
  return new Date(clinicToIso(shifted, 0, 0) as string);
}

/** Whole Chișinău days between a moment's day and today (positive = in the past). */
export function clinicDaysAgo(value: string | Date, now = new Date()): number {
  const day = (x: Date) => Date.parse(clinicParts(x).date);
  return Math.round((day(now) - day(new Date(value))) / 86_400_000);
}

/**
 * A date sent by a client. Full ISO values are taken as they are. Anything
 * without a time zone — "2026-10-14" from an old form, "2026-10-14T15:30" —
 * is Chișinău time, as it was written on the screen; Node would otherwise read
 * it as UTC and move it by three hours.
 */
export function parseClinicDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const raw = String(value).trim();
  if (!raw) return null;

  if (/(?:Z|[+-]\d{2}:?\d{2})$/i.test(raw)) {
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const dateOnly = raw.match(/^(\d{4}-\d{2}-\d{2})$/);
  if (dateOnly) {
    const iso = clinicToIso(dateOnly[1], 0, 0);
    return iso ? new Date(iso) : null;
  }
  const naive = raw.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}):(\d{2})/);
  if (naive) {
    const iso = clinicToIso(naive[1], naive[2], naive[3]);
    return iso ? new Date(iso) : null;
  }
  return null;
}

/** "marți, 14 oct., 15:30" — a follow-up as people read it. */
export function formatFollowUp(value: string | Date, withWeekday = true): string {
  return new Intl.DateTimeFormat("ro-RO", {
    ...(withWeekday ? { weekday: "long" as const } : {}),
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: CLINIC_TZ,
  }).format(new Date(value));
}
