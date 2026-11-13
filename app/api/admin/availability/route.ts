import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";
import { getMoldovaDayRangeUTC } from "@/lib/appointments";
import { clock, isOpenAt, moldovaMinutes, openTimes } from "@/lib/slots";

export const WORK_HOUR_START = 8;
export const WORK_HOUR_END = 23;

/**
 * A doctor account may only touch its own calendar; staff without a linked
 * TeamMember (reception, owner) may edit anyone's.
 */
function canEditDoctor(
  session: { doctorId?: string } | null,
  teamMemberId: string,
): boolean {
  if (!session) return false;
  if (!session.doctorId) return true;
  return session.doctorId === teamMemberId;
}

// GET /api/admin/availability?from=YYYY-MM-DD&to=YYYY-MM-DD[&teamMemberId=...]
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const teamMemberId = searchParams.get("teamMemberId");

    if (!from || !to) {
      return NextResponse.json(
        { error: "Parametrii 'from' și 'to' sunt obligatorii." },
        { status: 400 },
      );
    }

    const rows = await prisma.doctorAvailability.findMany({
      where: {
        date: { gte: from, lte: to },
        ...(teamMemberId ? { teamMemberId } : {}),
      },
      orderBy: { date: "asc" },
    });

    return NextResponse.json(rows);
  } catch (error) {
    console.error("Error fetching availability:", error);
    return NextResponse.json({ error: "Failed to fetch availability" }, { status: 500 });
  }
}

// PUT — replaces the hours for one doctor on one day.
export async function PUT(request: Request) {
  try {
    const session = await getSession();
    const body = (await request.json()) as Record<string, unknown>;
    const teamMemberId = String(body.teamMemberId || "");
    const date = String(body.date || "");
    const rawHours = Array.isArray(body.hours) ? body.hours : [];
    const hours: number[] = [
      ...new Set(
        rawHours
          .map((h) => Number(h))
          .filter(
            (h) => Number.isInteger(h) && h >= WORK_HOUR_START && h <= WORK_HOUR_END,
          ),
      ),
    ].sort((a, b) => a - b);

    // Start times off the hour — 11:15 is 675 — kept apart from the whole
    // hours, which older calendars already hold. Whole hours sent here are
    // ignored: they belong in `hours`.
    const rawTimes = Array.isArray(body.times) ? body.times : [];
    const times: number[] = [
      ...new Set(
        rawTimes
          .map((t) => Number(t))
          .filter(
            (t) =>
              Number.isInteger(t) &&
              t % 60 !== 0 &&
              t >= WORK_HOUR_START * 60 &&
              t < (WORK_HOUR_END + 1) * 60,
          ),
      ),
    ].sort((a, b) => a - b);

    if (!teamMemberId || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: "Doctor și dată (YYYY-MM-DD) sunt obligatorii." },
        { status: 400 },
      );
    }

    if (!canEditDoctor(session, teamMemberId)) {
      return NextResponse.json(
        { error: "Puteți edita doar propriul calendar." },
        { status: 403 },
      );
    }

    // Hours already booked can't be removed — the patient is expecting them.
    const { fromUTC, toUTC } = getMoldovaDayRangeUTC(new Date(`${date}T12:00:00Z`));
    const booked = await prisma.appointment.findMany({
      where: {
        teamMemberId,
        status: { in: ["pending", "confirmed"] },
        dateTime: { gte: fromUTC, lte: toUTC },
      },
      select: { dateTime: true },
    });
    // A patient at 11:15 is covered by 11:00 being ticked, or by 11:15 itself.
    const open = openTimes({ hours, times });
    const missing = booked
      .map((a) => moldovaMinutes(a.dateTime))
      .filter((m) => !isOpenAt(open, m))
      .sort((a, b) => a - b);
    if (missing.length > 0) {
      return NextResponse.json(
        {
          error: `Orele ${missing.map(clock).join(", ")} au deja programări. Anulați-le întâi.`,
        },
        { status: 409 },
      );
    }

    const row = await prisma.doctorAvailability.upsert({
      where: { teamMemberId_date: { teamMemberId, date } },
      create: { teamMemberId, date, hours, times },
      update: { hours, times },
    });

    return NextResponse.json(row);
  } catch (error) {
    console.error("Error saving availability:", error);
    return NextResponse.json({ error: "Failed to save availability" }, { status: 500 });
  }
}
