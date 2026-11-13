import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { notifyCancelled } from "@/lib/notifications";
import { releaseSlotByAppointment } from "@/lib/slots";
import { cancelReason, logStatusChange, panelActor } from "@/lib/appointment-log";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  try {
    const appt = await prisma.appointment.update({
      where: { id },
      data: { status: "cancelled" },
      include: { patient: true, service: true },
    });
    // A cancelled hour is free again. Without this it stayed reserved for good
    // and nobody else could be booked into it.
    await releaseSlotByAppointment(id);

    const by = await panelActor();
    await logStatusChange(id, "cancelled", by, "panou");
    notifyCancelled(appt, cancelReason(by, "panou")).catch((e) => console.error("notifyCancelled:", e));
    return NextResponse.json(appt);
  } catch (error) {
    console.error("Error cancelling appointment:", error);
    return NextResponse.json({ error: "Failed to cancel" }, { status: 500 });
  }
}
