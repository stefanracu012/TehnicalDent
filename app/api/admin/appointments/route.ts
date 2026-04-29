import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sanitizeObject, validateNoInjection } from "@/lib/security";
import {
  findOverlappingAppointment,
  generateConfirmToken,
  parseDateTime,
} from "@/lib/appointments";
import { notifyCreated } from "@/lib/notifications";
import type { AppointmentStatus } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const status = searchParams.get("status") as AppointmentStatus | null;
    const serviceId = searchParams.get("serviceId");
    const patientId = searchParams.get("patientId");
    const q = searchParams.get("q")?.trim();

    const where: Record<string, unknown> = {};
    if (from || to) {
      const range: Record<string, Date> = {};
      const f = from ? parseDateTime(from) : null;
      const t = to ? parseDateTime(to) : null;
      if (f) range.gte = f;
      if (t) range.lte = t;
      where.dateTime = range;
    }
    if (status) where.status = status;
    if (serviceId) where.serviceId = serviceId;
    if (patientId) where.patientId = patientId;

    let appointments = await prisma.appointment.findMany({
      where,
      orderBy: { dateTime: "asc" },
      include: {
        patient: { select: { id: true, name: true, phone: true } },
        service: { select: { id: true, title: true, slug: true, duration: true } },
      },
      take: 500,
    });

    // q filter (post-fetch — small dataset)
    if (q) {
      const ql = q.toLowerCase();
      appointments = appointments.filter(
        (a) =>
          a.patient.name.toLowerCase().includes(ql) ||
          a.patient.phone.includes(q) ||
          a.service.title.toLowerCase().includes(ql),
      );
    }

    return NextResponse.json(appointments);
  } catch (error) {
    console.error("Error fetching appointments:", error);
    return NextResponse.json({ error: "Failed to fetch appointments" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.json();
    if (!validateNoInjection(rawBody)) {
      return NextResponse.json({ error: "Input invalid detectat." }, { status: 400 });
    }
    const body = sanitizeObject(rawBody, ["notes"]);

    const patientId = String(body.patientId || "");
    const serviceId = String(body.serviceId || "");
    const dateTime = parseDateTime(body.dateTime);

    if (!patientId) {
      return NextResponse.json({ error: "Pacientul este obligatoriu." }, { status: 400 });
    }
    if (!serviceId) {
      return NextResponse.json({ error: "Serviciul este obligatoriu." }, { status: 400 });
    }
    if (!dateTime) {
      return NextResponse.json({ error: "Data/ora este invalidă." }, { status: 400 });
    }
    if (dateTime.getTime() < Date.now() - 60_000) {
      return NextResponse.json({ error: "Programarea nu poate fi în trecut." }, { status: 400 });
    }

    const [patient, service] = await Promise.all([
      prisma.patient.findUnique({ where: { id: patientId } }),
      prisma.service.findUnique({ where: { id: serviceId } }),
    ]);
    if (!patient) {
      return NextResponse.json({ error: "Pacientul nu a fost găsit." }, { status: 404 });
    }
    if (!service) {
      return NextResponse.json({ error: "Serviciul nu a fost găsit." }, { status: 404 });
    }

    const duration =
      typeof body.duration === "number" && body.duration > 0
        ? Math.round(body.duration)
        : service.duration || 30;

    const overlap = await findOverlappingAppointment({ dateTime, duration });
    if (overlap) {
      return NextResponse.json(
        {
          error: "Există deja o programare care se suprapune cu acest interval.",
          conflictId: overlap.id,
        },
        { status: 409 },
      );
    }

    const created = await prisma.appointment.create({
      data: {
        patientId,
        serviceId,
        dateTime,
        duration,
        notes: body.notes ? String(body.notes) : null,
        status: "pending",
      },
      include: {
        patient: true,
        service: true,
      },
    });

    // Store confirm token (deterministic from id, kept for audit / future rotation)
    await prisma.appointment.update({
      where: { id: created.id },
      data: { confirmToken: generateConfirmToken(created.id) },
    });

    // Fire-and-forget notifications (do not block response on failure)
    notifyCreated(created).catch((err) =>
      console.error("notifyCreated failed:", err),
    );

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Error creating appointment:", error);
    return NextResponse.json({ error: "Failed to create appointment" }, { status: 500 });
  }
}
