import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sanitizeObject, validateNoInjection } from "@/lib/security";
import { isValidPhone, normalizePhone } from "@/lib/appointments";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  try {
    const patient = await prisma.patient.findUnique({
      where: { id },
      include: {
        appointments: {
          orderBy: { dateTime: "desc" },
          include: { service: { select: { id: true, title: true, slug: true, duration: true } } },
        },
      },
    });
    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }
    return NextResponse.json(patient);
  } catch (error) {
    console.error("Error fetching patient:", error);
    return NextResponse.json({ error: "Failed to fetch patient" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params;
  try {
    const rawBody = await request.json();
    if (!validateNoInjection(rawBody)) {
      return NextResponse.json({ error: "Input invalid detectat." }, { status: 400 });
    }
    const body = sanitizeObject(rawBody, ["notes"]);

    const data: Record<string, unknown> = {};
    if (typeof body.name === "string") data.name = body.name.trim();
    if (typeof body.phone === "string") {
      if (!isValidPhone(body.phone)) {
        return NextResponse.json({ error: "Telefon invalid." }, { status: 400 });
      }
      data.phone = normalizePhone(body.phone);
    }
    if (typeof body.email === "string" || body.email === null) {
      data.email = body.email ? String(body.email).trim() : null;
    }
    if (typeof body.notes === "string" || body.notes === null) {
      data.notes = body.notes ? String(body.notes) : null;
    }

    const patient = await prisma.patient.update({ where: { id }, data });
    return NextResponse.json(patient);
  } catch (error) {
    console.error("Error updating patient:", error);
    return NextResponse.json({ error: "Failed to update patient" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  try {
    await prisma.patient.delete({ where: { id } });
    return NextResponse.json({ message: "Patient deleted" });
  } catch (error) {
    console.error("Error deleting patient:", error);
    return NextResponse.json({ error: "Failed to delete patient" }, { status: 500 });
  }
}
