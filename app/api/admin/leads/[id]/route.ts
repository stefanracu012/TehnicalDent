import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sanitizeObject, validateNoInjection } from "@/lib/security";
import { convertLeadToPatient, LeadError, normalisePhone } from "@/lib/leads";
import { LEAD_SOURCES, LEAD_STATUS_VALUES } from "@/lib/leads-config";
import type { LeadSource, LeadStatus } from "@prisma/client";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  try {
    const lead = await prisma.lead.findUnique({
      where: { id },
      include: { leadNotes: { orderBy: { createdAt: "desc" } } },
    });
    if (!lead) {
      return NextResponse.json({ error: "Leadul nu există." }, { status: 404 });
    }

    const [assignedTo, patient, staff] = await Promise.all([
      lead.assignedToId
        ? prisma.adminUser.findUnique({
            where: { id: lead.assignedToId },
            select: { name: true, email: true },
          })
        : null,
      lead.patientId
        ? prisma.patient.findUnique({
            where: { id: lead.patientId },
            select: { id: true, name: true },
          })
        : null,
      prisma.adminUser.findMany({
        where: { isActive: true },
        select: { id: true, name: true, email: true },
        orderBy: { name: "asc" },
      }),
    ]);

    // Same meaning as in the list: the key is "<source>:<sender id or number>".
    const personId =
      lead.source === "messenger" || lead.source === "instagram" || lead.source === "whatsapp"
        ? lead.sourceKey.slice(lead.source.length + 1)
        : null;

    return NextResponse.json({
      ...lead,
      assignedToName: assignedTo ? assignedTo.name || assignedTo.email : null,
      patient,
      staff,
      conversation: personId ? { platform: lead.source, personId } : null,
    });
  } catch (error) {
    console.error("Error fetching lead:", error);
    return NextResponse.json({ error: "Nu am putut încărca leadul." }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params;
  try {
    const raw = await request.json();
    if (!validateNoInjection(raw)) {
      return NextResponse.json({ error: "Input invalid detectat." }, { status: 400 });
    }
    const body = sanitizeObject(raw, ["note", "firstMessage"]);

    // Whitelisted rather than spread: a PATCH must not be able to rewrite
    // sourceKey or attach the lead to an arbitrary patient.
    const data: Record<string, unknown> = {};
    for (const key of ["name", "email", "note", "sourceDetail", "interestedIn", "firstMessage"]) {
      if (typeof body[key] === "string") data[key] = body[key] || null;
    }
    if (typeof body.phone === "string") {
      data.phone = body.phone ? (normalisePhone(body.phone) ?? body.phone) : null;
    }
    if (typeof body.status === "string") {
      if (!LEAD_STATUS_VALUES.includes(body.status as never)) {
        return NextResponse.json({ error: "Status invalid." }, { status: 400 });
      }
      data.status = body.status;
    }
    if ("followUpAt" in body) {
      data.followUpAt = body.followUpAt ? new Date(body.followUpAt as string) : null;
    }
    if ("assignedToId" in body) {
      data.assignedToId = body.assignedToId ? String(body.assignedToId) : null;
    }

    // A lead that arrived through a channel keeps that source — the inbox
    // matches conversations to leads by it. Only hand-entered ones can change.
    if (typeof body.source === "string") {
      const current = await prisma.lead.findUnique({
        where: { id },
        select: { source: true },
      });
      const editable = (s?: string) =>
        LEAD_SOURCES.some((o) => o.value === s && o.manual) || s === "manual";
      if (current && editable(current.source) && editable(body.source)) {
        data.source = body.source as LeadSource;
      }
    }

    // Moving a lead to "Pacient" makes the patient, the same as the button
    // does. Done first, so a lead with no phone is refused before anything else
    // on it changes.
    const becomingPatient = data.status === "convertit";
    if (becomingPatient) {
      const existing = await prisma.lead.findUnique({
        where: { id },
        select: { patientId: true, phone: true },
      });
      const phoneNow = (data.phone as string | null | undefined) ?? existing?.phone;
      if (existing && !existing.patientId && !phoneNow) {
        return NextResponse.json(
          { error: "Adaugă un număr de telefon înainte de a trece leadul la Pacient." },
          { status: 400 },
        );
      }
      // Save the rest (a phone typed in the same edit) before converting.
      delete data.status;
    }

    let lead = Object.keys(data).length
      ? await prisma.lead.update({ where: { id }, data })
      : await prisma.lead.findUniqueOrThrow({ where: { id } });

    let converted = false;
    if (becomingPatient) {
      if (!lead.patientId) {
        await convertLeadToPatient(id);
        converted = true;
      } else {
        await prisma.lead.update({
          where: { id },
          data: { status: "convertit" as LeadStatus, followUpAt: null },
        });
      }
      lead = await prisma.lead.findUniqueOrThrow({ where: { id } });
    }

    return NextResponse.json({ ...lead, converted });
  } catch (error) {
    if (error instanceof LeadError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Error updating lead:", error);
    return NextResponse.json({ error: "Nu am putut salva." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  try {
    // Removes the lead and its notes. A patient created from it stays, along
    // with the conversation it came from.
    await prisma.lead.delete({ where: { id } });
    return NextResponse.json({ message: "Șters" });
  } catch (error) {
    console.error("Error deleting lead:", error);
    return NextResponse.json({ error: "Nu am putut șterge." }, { status: 500 });
  }
}
