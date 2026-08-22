import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Turns a lead into a patient, carrying across what is already known.
 *
 * A patient needs a phone, so a lead without one cannot be converted — that is
 * the missing piece to go and ask for, not something to invent a placeholder
 * for. An existing patient on the same number is linked rather than duplicated.
 */
export async function POST(request: Request, { params }: RouteParams) {
  const { id } = await params;

  try {
    const lead = await prisma.lead.findUnique({ where: { id } });
    if (!lead) {
      return NextResponse.json({ error: "Leadul nu există." }, { status: 404 });
    }
    if (lead.patientId) {
      return NextResponse.json(
        { error: "Leadul are deja un pacient." },
        { status: 409 },
      );
    }
    if (!lead.phone) {
      return NextResponse.json(
        { error: "Adaugă un număr de telefon înainte de a crea pacientul." },
        { status: 400 },
      );
    }

    const existing = await prisma.patient.findFirst({
      where: { phone: lead.phone },
    });

    const patient =
      existing ??
      (await prisma.patient.create({
        data: {
          name: lead.name || "Pacient fără nume",
          phone: lead.phone,
          email: lead.email,
          // The first message is the closest thing to a reason for the visit,
          // so it travels with them instead of being left behind in a chat.
          notes: [lead.note, lead.firstMessage && `Primul mesaj: ${lead.firstMessage}`]
            .filter(Boolean)
            .join("\n\n") || null,
        },
      }));

    await prisma.lead.update({
      where: { id },
      data: { patientId: patient.id, status: "convertit", followUpAt: null },
    });

    return NextResponse.json({ patient, reused: Boolean(existing) });
  } catch (error) {
    console.error("Error converting lead:", error);
    return NextResponse.json(
      { error: "Nu am putut crea pacientul." },
      { status: 500 },
    );
  }
}
