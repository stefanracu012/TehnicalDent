import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sanitizeObject, validateNoInjection } from "@/lib/security";
import {
  findOverlappingAppointment,
  parseDateTime,
} from "@/lib/appointments";
import {
  notifyCancelled,
  notifyConfirmed,
} from "@/lib/notifications";
import type { AppointmentStatus } from "@prisma/client";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  try {
    const appt = await prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: true,
        service: true,
        notifications: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!appt) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(appt);
  } catch (error) {
    console.error("Error fetching appointment:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

const ALLOWED_STATUSES: AppointmentStatus[] = [
  "pending",
  "confirmed",
  "cancelled",
  "completed",
  "noshow",
];

export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params;
  try {
    const rawBody = await request.json();
    if (!validateNoInjection(rawBody)) {
      return NextResponse.json({ error: "Input invalid detectat." }, { status: 400 });
    }
    const body = sanitizeObject(rawBody, ["notes"]);

    const current = await prisma.appointment.findUnique({
      where: { id },
      include: { patient: true, service: true },
    });
    if (!current) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const data: Record<string, unknown> = {};

    if (body.dateTime !== undefined) {
      const dt = parseDateTime(body.dateTime);
      if (!dt) {
        return NextResponse.json({ error: "Data/ora invalidă." }, { status: 400 });
      }
      data.dateTime = dt;
    }

    if (body.serviceId !== undefined) {
      const svc = await prisma.service.findUnique({ where: { id: String(body.serviceId) } });
      if (!svc) {
        return NextResponse.json({ error: "Serviciul nu există." }, { status: 404 });
      }
      data.serviceId = svc.id;
      // recompute duration unless explicitly provided
      if (body.duration === undefined) data.duration = svc.duration || 30;
    }

    if (typeof body.duration === "number" && body.duration > 0) {
      data.duration = Math.round(body.duration);
    }

    if (typeof body.status === "string") {
      if (!ALLOWED_STATUSES.includes(body.status as AppointmentStatus)) {
        return NextResponse.json({ error: "Status invalid." }, { status: 400 });
      }
      data.status = body.status;
    }

    if (body.notes !== undefined) {
      data.notes = body.notes ? String(body.notes) : null;
    }

    // overlap check if dateTime/duration/serviceId changed
    if (data.dateTime || data.duration || data.serviceId) {
      const dt = (data.dateTime as Date) || current.dateTime;
      const dur = (data.duration as number) || current.duration;
      const overlap = await findOverlappingAppointment({
        dateTime: dt,
        duration: dur,
        excludeId: id,
      });
      if (overlap) {
        return NextResponse.json(
          {
            error: "Există deja o programare care se suprapune cu acest interval.",
            conflictId: overlap.id,
          },
          { status: 409 },
        );
      }
    }

    const updated = await prisma.appointment.update({
      where: { id },
      data,
      include: { patient: true, service: true },
    });

    // Status-change notifications
    if (data.status && data.status !== current.status) {
      if (data.status === "confirmed") {
        notifyConfirmed(updated).catch((e) => console.error("notifyConfirmed:", e));
      } else if (data.status === "cancelled") {
        notifyCancelled(updated, "Anulat din admin").catch((e) =>
          console.error("notifyCancelled:", e),
        );
      }
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating appointment:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  try {
    const current = await prisma.appointment.findUnique({
      where: { id },
      include: { patient: true, service: true },
    });
    if (!current) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    await prisma.appointment.delete({ where: { id } });
    notifyCancelled(current, "Șters din admin").catch((e) =>
      console.error("notifyCancelled (delete):", e),
    );
    return NextResponse.json({ message: "Appointment deleted" });
  } catch (error) {
    console.error("Error deleting appointment:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
