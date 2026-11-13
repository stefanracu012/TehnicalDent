import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { notifyConfirmed } from "@/lib/notifications";
import { reclaimSlotOnReactivate, SlotTakenError } from "@/lib/slots";
import { logStatusChange, panelActor } from "@/lib/appointment-log";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  try {
    const current = await prisma.appointment.findUnique({ where: { id } });
    if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Confirming a cancelled appointment takes its hour back first.
    await reclaimSlotOnReactivate(current, "confirmed");

    const appt = await prisma.appointment.update({
      where: { id },
      data: { status: "confirmed" },
      include: { patient: true, service: true },
    });
    if (current.status !== "confirmed") {
      await logStatusChange(id, "confirmed", await panelActor(), "panou");
    }
    notifyConfirmed(appt).catch((e) => console.error("notifyConfirmed:", e));
    return NextResponse.json(appt);
  } catch (error) {
    if (error instanceof SlotTakenError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error("Error confirming appointment:", error);
    return NextResponse.json({ error: "Failed to confirm" }, { status: 500 });
  }
}
