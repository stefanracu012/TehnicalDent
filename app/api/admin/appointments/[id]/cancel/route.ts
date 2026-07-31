import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { notifyCancelled } from "@/lib/notifications";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const { id } = await params;
  try {
    const body = (await request.json().catch(() => ({}))) as { reason?: string };
    const reason = typeof body.reason === "string" ? body.reason.slice(0, 500) : undefined;

    const appt = await prisma.appointment.update({
      where: { id },
      data: { status: "cancelled" },
      include: { patient: true, service: true },
    });
    notifyCancelled(appt, reason).catch((e) => console.error("notifyCancelled:", e));
    return NextResponse.json(appt);
  } catch (error) {
    console.error("Error cancelling appointment:", error);
    return NextResponse.json({ error: "Failed to cancel" }, { status: 500 });
  }
}
