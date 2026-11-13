import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getMoldovaDateStr } from "@/lib/appointments";
import { bookableDoctors, freeTimes, moldovaMinutes } from "@/lib/slots";

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

    const doctors = await bookableDoctors();

    // When editing, the appointment's own hour must stay selectable.
    let ownTime: { teamMemberId: string; minutes: number } | null = null;
    if (excludeAppointmentId) {
      const own = await prisma.appointment.findUnique({
        where: { id: excludeAppointmentId },
        select: { teamMemberId: true, dateTime: true },
      });
      // Only when it is on the day being looked at.
      if (own?.teamMemberId && getMoldovaDateStr(own.dateTime) === date) {
        ownTime = { teamMemberId: own.teamMemberId, minutes: moldovaMinutes(own.dateTime) };
      }
    }

    // Start times in minutes since midnight (11:15 → 675): the whole hours
    // the doctor ticked and the custom times they added.
    const slots: Record<string, number[]> = {};
    for (const doctor of doctors) {
      const times = await freeTimes(doctor.id, date, excludeAppointmentId ?? undefined);
      if (ownTime && ownTime.teamMemberId === doctor.id && !times.includes(ownTime.minutes)) {
        times.push(ownTime.minutes);
        times.sort((a, b) => a - b);
      }
      slots[doctor.id] = times;
    }

    return NextResponse.json({ doctors, slots });
  } catch (error) {
    console.error("Error fetching free slots:", error);
    return NextResponse.json({ error: "Failed to fetch free slots" }, { status: 500 });
  }
}
