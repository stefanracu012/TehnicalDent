import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";
import { getMoldovaDayRangeUTC } from "@/lib/appointments";

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
    const body = await request.json();
    const teamMemberId = String(body.teamMemberId || "");
    const date = String(body.date || "");
    const hours: number[] = Array.isArray(body.hours)
      ? [
          ...new Set(
            body.hours
              .map((h: unknown) => Number(h))
              .filter(
                (h: number) =>
                  Number.isInteger(h) && h >= WORK_HOUR_START && h <= WORK_HOUR_END,
              ),
          ),
        ].sort((a, b) => a - b)
      : [];

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
    const bookedHours = booked.map((a) =>
      Number(
        new Intl.DateTimeFormat("en-GB", {
          hour: "2-digit",
          hour12: false,
          timeZone: "Europe/Chisinau",
        }).format(a.dateTime),
      ),
    );
    const missing = bookedHours.filter((h) => !hours.includes(h));
    if (missing.length > 0) {
      return NextResponse.json(
        {
          error: `Orele ${missing.sort((a, b) => a - b).join(", ")}:00 au deja programări. Anulați-le întâi.`,
        },
        { status: 409 },
      );
    }

    const row = await prisma.doctorAvailability.upsert({
      where: { teamMemberId_date: { teamMemberId, date } },
      create: { teamMemberId, date, hours },
      update: { hours },
    });

    return NextResponse.json(row);
  } catch (error) {
    console.error("Error saving availability:", error);
    return NextResponse.json({ error: "Failed to save availability" }, { status: 500 });
  }
}
