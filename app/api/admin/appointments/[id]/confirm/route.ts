import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { notifyConfirmed } from "@/lib/notifications";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  try {
    const appt = await prisma.appointment.update({
      where: { id },
      data: { status: "confirmed" },
      include: { patient: true, service: true },
    });
    notifyConfirmed(appt).catch((e) => console.error("notifyConfirmed:", e));
    return NextResponse.json(appt);
  } catch (error) {
    console.error("Error confirming appointment:", error);
    return NextResponse.json({ error: "Failed to confirm" }, { status: 500 });
  }
}
