import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sanitizeObject, validateNoInjection } from "@/lib/security";
import { normalisePhone } from "@/lib/leads";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const STATUSES = ["nou", "contactat", "programat", "convertit", "pierdut"];

export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params;
  try {
    const raw = await request.json();
    if (!validateNoInjection(raw)) {
      return NextResponse.json({ error: "Input invalid detectat." }, { status: 400 });
    }
    const body = sanitizeObject(raw, ["note"]);

    // Whitelisted rather than spread: a PATCH must not be able to rewrite
    // sourceKey or attach the lead to an arbitrary patient.
    const data: Record<string, unknown> = {};
    if (typeof body.name === "string") data.name = body.name || null;
    if (typeof body.email === "string") data.email = body.email || null;
    if (typeof body.note === "string") data.note = body.note || null;
    if (typeof body.phone === "string") {
      data.phone = body.phone ? normalisePhone(body.phone) ?? body.phone : null;
    }
    if (typeof body.status === "string" && STATUSES.includes(body.status)) {
      data.status = body.status;
    }
    if ("followUpAt" in body) {
      data.followUpAt = body.followUpAt ? new Date(body.followUpAt as string) : null;
    }

    const lead = await prisma.lead.update({ where: { id }, data });
    return NextResponse.json(lead);
  } catch (error) {
    console.error("Error updating lead:", error);
    return NextResponse.json({ error: "Nu am putut salva." }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const { id } = await params;
  try {
    // Removes the lead only. A patient created from it stays, along with the
    // conversation it came from.
    await prisma.lead.delete({ where: { id } });
    return NextResponse.json({ message: "Șters" });
  } catch (error) {
    console.error("Error deleting lead:", error);
    return NextResponse.json({ error: "Nu am putut șterge." }, { status: 500 });
  }
}
