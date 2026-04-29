import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sanitizeObject, validateNoInjection } from "@/lib/security";
import { isValidPhone, normalizePhone } from "@/lib/appointments";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim();

    const where = q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { phone: { contains: normalizePhone(q) } },
            { email: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {};

    const patients = await prisma.patient.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        _count: { select: { appointments: true } },
      },
    });
    return NextResponse.json(patients);
  } catch (error) {
    console.error("Error fetching patients:", error);
    return NextResponse.json({ error: "Failed to fetch patients" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.json();
    if (!validateNoInjection(rawBody)) {
      return NextResponse.json({ error: "Input invalid detectat." }, { status: 400 });
    }
    const body = sanitizeObject(rawBody, ["notes"]);

    if (!body.name || typeof body.name !== "string") {
      return NextResponse.json({ error: "Numele este obligatoriu." }, { status: 400 });
    }
    if (!body.phone || !isValidPhone(String(body.phone))) {
      return NextResponse.json(
        { error: "Telefonul este invalid (7-15 cifre)." },
        { status: 400 },
      );
    }

    const phone = normalizePhone(String(body.phone));
    // Best-effort dedupe by phone
    const existing = await prisma.patient.findFirst({ where: { phone } });
    if (existing) {
      return NextResponse.json(
        { error: "Există deja un pacient cu acest telefon.", id: existing.id },
        { status: 409 },
      );
    }

    const patient = await prisma.patient.create({
      data: {
        name: String(body.name).trim(),
        phone,
        email: body.email ? String(body.email).trim() : null,
        notes: body.notes ? String(body.notes) : null,
      },
    });
    return NextResponse.json(patient, { status: 201 });
  } catch (error) {
    console.error("Error creating patient:", error);
    return NextResponse.json({ error: "Failed to create patient" }, { status: 500 });
  }
}
