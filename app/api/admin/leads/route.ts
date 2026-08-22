import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sanitizeObject, validateNoInjection } from "@/lib/security";
import { normalisePhone } from "@/lib/leads";
import type { LeadStatus } from "@prisma/client";

const STATUSES = ["nou", "contactat", "programat", "convertit", "pierdut"];

/**
 * Open leads first, and within those the ones already due.
 *
 * A list sorted purely by date buries the person you promised to call
 * yesterday under everyone who wrote this morning.
 */
export async function GET(request: Request) {
  const status = new URL(request.url).searchParams.get("status");

  try {
    const leads = await prisma.lead.findMany({
      where:
        status && STATUSES.includes(status)
          ? { status: status as LeadStatus }
          : {},
      orderBy: [{ followUpAt: "asc" }, { createdAt: "desc" }],
      take: 500,
    });

    const counts = await prisma.lead.groupBy({
      by: ["status"],
      _count: { _all: true },
    });

    return NextResponse.json({
      leads,
      counts: Object.fromEntries(
        counts.map((c) => [c.status, c._count._all]),
      ),
      dueCount: await prisma.lead.count({
        where: {
          followUpAt: { lte: new Date() },
          status: { notIn: ["convertit", "pierdut"] },
        },
      }),
    });
  } catch (error) {
    console.error("Error fetching leads:", error);
    return NextResponse.json(
      { error: "Nu am putut încărca leadurile." },
      { status: 500 },
    );
  }
}

/** A lead someone took down by hand — a phone call, a walk-in. */
export async function POST(request: Request) {
  try {
    const raw = await request.json();
    if (!validateNoInjection(raw)) {
      return NextResponse.json(
        { error: "Input invalid detectat." },
        { status: 400 },
      );
    }
    const body = sanitizeObject(raw, ["note", "firstMessage"]);

    if (!body.name && !body.phone) {
      return NextResponse.json(
        { error: "Adaugă măcar un nume sau un telefon." },
        { status: 400 },
      );
    }

    const lead = await prisma.lead.create({
      data: {
        source: "manual",
        // Manual entries have no conversation behind them, so the key is minted
        // here — it exists to keep automatic sources from duplicating, and a
        // person typing a second lead means a second lead.
        sourceKey: `manual:${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: body.name || null,
        phone: body.phone ? normalisePhone(body.phone) ?? body.phone : null,
        email: body.email || null,
        note: body.note || null,
        firstMessage: body.firstMessage || null,
      },
    });

    return NextResponse.json(lead, { status: 201 });
  } catch (error) {
    console.error("Error creating lead:", error);
    return NextResponse.json(
      { error: "Nu am putut crea leadul." },
      { status: 500 },
    );
  }
}
