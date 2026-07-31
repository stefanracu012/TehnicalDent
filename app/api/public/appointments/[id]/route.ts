import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyConfirmToken } from "@/lib/appointments";
import { notifyConfirmed, notifyCancelled } from "@/lib/notifications";

interface RouteParams {
  params: Promise<{ id: string }>;
}

async function loadAppt(id: string) {
  return prisma.appointment.findUnique({
    where: { id },
    include: { patient: true, service: true },
  });
}

export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token") || "";

  if (!verifyConfirmToken(id, token)) {
    return NextResponse.json({ error: "Token invalid." }, { status: 403 });
  }
  const appt = await loadAppt(id);
  if (!appt) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    id: appt.id,
    dateTime: appt.dateTime,
    duration: appt.duration,
    status: appt.status,
    patient: { name: appt.patient.name },
    service: { title: appt.service.title },
  });
}

export async function POST(request: Request, { params }: RouteParams) {
  const { id } = await params;
  try {
    const body = (await request.json().catch(() => ({}))) as { token?: string; action?: string };
    const token = String(body.token || "");
    const action = body.action;

    if (!verifyConfirmToken(id, token)) {
      return NextResponse.json({ error: "Token invalid." }, { status: 403 });
    }
    if (action !== "confirm" && action !== "cancel") {
      return NextResponse.json({ error: "Acțiune invalidă." }, { status: 400 });
    }

    const current = await loadAppt(id);
    if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // No-op if already in target state
    if (action === "confirm" && current.status === "confirmed") {
      return NextResponse.json({ ok: true, status: "confirmed" });
    }
    if (action === "cancel" && current.status === "cancelled") {
      return NextResponse.json({ ok: true, status: "cancelled" });
    }
    if (current.status === "completed" || current.status === "noshow") {
      return NextResponse.json(
        { error: "Programarea nu mai poate fi modificată." },
        { status: 400 },
      );
    }

    const updated = await prisma.appointment.update({
      where: { id },
      data: { status: action === "confirm" ? "confirmed" : "cancelled" },
      include: { patient: true, service: true },
    });

    if (action === "confirm") {
      notifyConfirmed(updated).catch((e) => console.error(e));
    } else {
      notifyCancelled(updated, "Anulat de pacient").catch((e) => console.error(e));
    }

    return NextResponse.json({ ok: true, status: updated.status });
  } catch (error) {
    console.error("Public confirm/cancel error:", error);
    return NextResponse.json({ error: "Eroare server." }, { status: 500 });
  }
}
