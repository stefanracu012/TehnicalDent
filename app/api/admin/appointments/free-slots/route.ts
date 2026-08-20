import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { freeHours } from "@/lib/slots";

/**
 * Doctors plus their free hours for one day, in a single request so the
 * booking form can populate both selects at once.
 *
 * Lives under /appointments rather than /availability on purpose: reception
 * staff need it to book, but shouldn't require the calendar permission.
 *
 * GET /api/admin/appointments/free-slots?date=YYYY-MM-DD[&excludeAppointmentId=...]
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const excludeAppointmentId = searchParams.get("excludeAppointmentId");

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: "Parametrul 'date' (YYYY-MM-DD) este obligatoriu." },
        { status: 400 },
      );
    }

    const doctors = await prisma.teamMember.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
      select: { id: true, name: true, role: true },
    });

    // When editing, the appointment's own hour must stay selectable.
    let ownHour: { teamMemberId: string; hour: number } | null = null;
    if (excludeAppointmentId) {
      const own = await prisma.appointment.findUnique({
        where: { id: excludeAppointmentId },
        select: { teamMemberId: true, dateTime: true },
      });
      if (own?.teamMemberId) {
        ownHour = {
          teamMemberId: own.teamMemberId,
          hour: Number(
            new Intl.DateTimeFormat("en-GB", {
              hour: "2-digit",
              hour12: false,
              timeZone: "Europe/Chisinau",
            }).format(own.dateTime),
          ),
        };
      }
    }

    const slots: Record<string, number[]> = {};
    for (const doctor of doctors) {
      const hours = await freeHours(doctor.id, date);
      if (ownHour && ownHour.teamMemberId === doctor.id && !hours.includes(ownHour.hour)) {
        hours.push(ownHour.hour);
        hours.sort((a, b) => a - b);
      }
      slots[doctor.id] = hours;
    }

    return NextResponse.json({ doctors, slots });
  } catch (error) {
    console.error("Error fetching free slots:", error);
    return NextResponse.json({ error: "Failed to fetch free slots" }, { status: 500 });
  }
}
