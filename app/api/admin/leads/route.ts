import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sanitizeObject, validateNoInjection } from "@/lib/security";
import { normalisePhone } from "@/lib/leads";
import { literal } from "@/lib/text-search";
import { clinicDayStart, clinicParts, clinicToIso, parseClinicDate } from "@/lib/chisinau-time";
import { notifyAssigned } from "@/lib/lead-telegram";
import {
  CLOSED_STATUSES,
  LEAD_SOURCE_VALUES,
  LEAD_STATUS_VALUES,
} from "@/lib/leads-config";
import type { LeadSource, LeadStatus, Prisma } from "@prisma/client";

const PAGE_SIZES = [25, 50, 100];

/** Comma-separated query values, kept only when the server knows them. */
function csv<T extends string>(raw: string | null, allowed: readonly T[]): T[] {
  return (raw ?? "")
    .split(",")
    .filter((v): v is T => (allowed as readonly string[]).includes(v));
}

/**
 * What a lead's source says about the conversation it came from. Messenger and
 * Instagram leads are keyed by the sender's id and WhatsApp ones by the number,
 * which is exactly what the inbox needs to open that conversation.
 */
function conversationOf(source: string, sourceKey: string) {
  if (source !== "messenger" && source !== "instagram" && source !== "whatsapp") {
    return null;
  }
  const personId = sourceKey.slice(source.length + 1);
  return personId ? { platform: source, personId } : null;
}

/**
 * The list, filtered and paginated on the server.
 *
 * The counts above the list are taken over every lead, not over the current
 * page — a page of fifty says nothing about how many are overdue.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;

  try {
    const where: Prisma.LeadWhereInput = {};
    const and: Prisma.LeadWhereInput[] = [];

    const statuses = csv(params.get("status"), LEAD_STATUS_VALUES);
    if (statuses.length) where.status = { in: statuses as LeadStatus[] };

    const sources = csv(params.get("source"), LEAD_SOURCE_VALUES);
    if (sources.length) where.source = { in: sources as LeadSource[] };

    const assigned = params.get("assigned");
    if (assigned === "none") where.assignedToId = null;
    else if (assigned && /^[a-f0-9]{24}$/i.test(assigned)) where.assignedToId = assigned;

    // Days are Chișinău days. The server runs on UTC, where "today" would start
    // three hours late and a follow-up at 01:00 would land on the wrong day.
    const today = clinicDayStart(0);
    const tomorrow = clinicDayStart(1);

    // Follow-up, by day: "overdue" means before today, not before this minute.
    const followUp = params.get("followUp");
    if (followUp === "overdue") where.followUpAt = { lt: today };
    else if (followUp === "today") where.followUpAt = { gte: today, lt: tomorrow };
    else if (followUp === "upcoming") where.followUpAt = { gte: tomorrow };
    else if (followUp === "none") where.followUpAt = null;
    if (followUp === "overdue") where.status = { notIn: CLOSED_STATUSES as LeadStatus[] };

    // Period, by name: "yesterday" is the calendar day, not the last 24 hours.
    const period = params.get("period");
    const from = params.get("from");
    const to = params.get("to");
    const created: Prisma.DateTimeFilter = {};
    const todayStr = clinicParts(new Date()).date;
    const monthStart = (ym: string) => new Date(clinicToIso(`${ym}-01`, 0, 0) as string);
    if (period === "today") created.gte = today;
    else if (period === "yesterday") {
      created.gte = clinicDayStart(-1);
      created.lt = today;
    } else if (period === "week") {
      // The week starts on Monday, as in the calendar.
      const weekday = new Date(`${todayStr}T12:00:00Z`).getUTCDay();
      created.gte = clinicDayStart(-((weekday + 6) % 7));
    } else if (period === "month") {
      created.gte = monthStart(todayStr.slice(0, 7));
    } else if (period === "prev-month") {
      const [y, m] = todayStr.split("-").map(Number);
      created.gte = monthStart(m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`);
      created.lt = monthStart(todayStr.slice(0, 7));
    } else if (period === "interval") {
      const fromDay = parseClinicDate(from);
      const toDay = parseClinicDate(to);
      if (fromDay) created.gte = fromDay;
      if (toDay) created.lt = clinicDayStart(1, toDay);
    }
    if (Object.keys(created).length) where.createdAt = created;

    const typed = (params.get("q") ?? "").trim();
    if (typed) {
      // Escaped: Prisma passes these to MongoDB as patterns (lib/text-search.ts).
      const q = literal(typed);
      const digits = typed.replace(/\D/g, "").replace(/^(373|0)/, "");
      and.push({
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { phone: { contains: q } },
          // A number typed as 060 123 456 is stored as +37360123456.
          ...(digits.length >= 5 ? [{ phone: { contains: digits } }] : []),
          { email: { contains: q, mode: "insensitive" } },
          { firstMessage: { contains: q, mode: "insensitive" } },
          { interestedIn: { contains: q, mode: "insensitive" } },
          { sourceDetail: { contains: q, mode: "insensitive" } },
        ],
      });
    }
    if (and.length) where.AND = and;

    const sort = params.get("sort") ?? "newest";
    const orderBy: Prisma.LeadOrderByWithRelationInput[] =
      sort === "oldest"
        ? [{ createdAt: "asc" }]
        : sort === "followup"
          ? [{ followUpAt: "asc" }, { createdAt: "desc" }]
          : sort === "name"
            ? [{ name: "asc" }]
            : [{ createdAt: "desc" }];

    const asked = Number(params.get("pageSize"));
    const pageSize = PAGE_SIZES.includes(asked) ? asked : 50;
    const page = Math.max(Number(params.get("page")) || 1, 1);

    const [leads, totalCount, byStatusRaw, total, overdue, staff] = await Promise.all([
      prisma.lead.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { _count: { select: { leadNotes: true } } },
      }),
      prisma.lead.count({ where }),
      prisma.lead.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.lead.count(),
      prisma.lead.count({
        where: {
          followUpAt: { lt: today },
          status: { notIn: CLOSED_STATUSES as LeadStatus[] },
        },
      }),
      prisma.adminUser.findMany({
        where: { isActive: true },
        select: { id: true, name: true, email: true },
        orderBy: { name: "asc" },
      }),
    ]);

    const staffName = new Map(staff.map((u) => [u.id, u.name || u.email]));

    return NextResponse.json({
      leads: leads.map((l) => ({
        id: l.id,
        name: l.name,
        phone: l.phone,
        email: l.email,
        source: l.source,
        sourceDetail: l.sourceDetail,
        firstMessage: l.firstMessage,
        interestedIn: l.interestedIn,
        status: l.status,
        note: l.note,
        followUpAt: l.followUpAt?.toISOString() ?? null,
        patientId: l.patientId,
        assignedToId: l.assignedToId,
        assignedToName: l.assignedToId ? (staffName.get(l.assignedToId) ?? null) : null,
        notesCount: l._count.leadNotes,
        conversation: conversationOf(l.source, l.sourceKey),
        createdAt: l.createdAt.toISOString(),
      })),
      page,
      pageSize,
      totalCount,
      totalPages: Math.max(Math.ceil(totalCount / pageSize), 1),
      stats: {
        total,
        overdue,
        byStatus: Object.fromEntries(byStatusRaw.map((r) => [r.status, r._count._all])),
      },
      staff,
    });
  } catch (error) {
    console.error("Error fetching leads:", error);
    return NextResponse.json(
      { error: "Nu am putut încărca leadurile." },
      { status: 500 },
    );
  }
}

/**
 * A lead taken down by hand — a phone call, a walk-in — or one opened from a
 * conversation in the inbox.
 *
 * From the inbox the key is the same one the webhooks mint, so the next message
 * from that person lands on this lead instead of opening a second beside it.
 * Asking for a conversation that already has a lead returns that lead.
 */
export async function POST(request: Request) {
  try {
    const raw = await request.json();
    if (!validateNoInjection(raw)) {
      return NextResponse.json({ error: "Input invalid detectat." }, { status: 400 });
    }
    const body = sanitizeObject(raw, ["note", "firstMessage"]);

    if (!body.name && !body.phone) {
      return NextResponse.json(
        { error: "Adaugă măcar un nume sau un telefon." },
        { status: 400 },
      );
    }
    if (body.status && !LEAD_STATUS_VALUES.includes(body.status as never)) {
      return NextResponse.json({ error: "Status invalid." }, { status: 400 });
    }

    const conversation = body.conversation as
      | { platform?: string; personId?: string }
      | undefined;
    const fromConversation =
      conversation?.personId &&
      ["messenger", "instagram", "whatsapp"].includes(conversation.platform ?? "");

    const source = fromConversation
      ? (conversation!.platform as LeadSource)
      : LEAD_SOURCE_VALUES.includes(body.source as never)
        ? (body.source as LeadSource)
        : "manual";

    const sourceKey = fromConversation
      ? `${source}:${conversation!.personId}`
      : // Manual entries have no conversation behind them, so the key is minted
        // here — it exists to keep automatic sources from duplicating, and a
        // person typing a second lead means a second lead.
        `manual:${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    if (fromConversation) {
      const existing = await prisma.lead.findUnique({ where: { sourceKey } });
      if (existing) return NextResponse.json(existing, { status: 200 });
    }

    const phone = body.phone ? (normalisePhone(String(body.phone)) ?? String(body.phone)) : null;

    const lead = await prisma.lead.create({
      data: {
        source,
        sourceKey,
        name: (body.name as string) || null,
        phone,
        email: (body.email as string) || null,
        sourceDetail: (body.sourceDetail as string) || null,
        interestedIn: (body.interestedIn as string) || null,
        firstMessage: (body.firstMessage as string) || null,
        note: (body.note as string) || null,
        status: (body.status as LeadStatus) || (fromConversation ? "contactat" : "nou"),
        followUpAt: parseClinicDate(body.followUpAt),
        assignedToId: (body.assignedToId as string) || null,
      },
    });

    // Given to someone from the start: it reaches them in private.
    if (lead.assignedToId) await notifyAssigned(lead);

    return NextResponse.json(lead, { status: 201 });
  } catch (error) {
    console.error("Error creating lead:", error);
    return NextResponse.json({ error: "Nu am putut crea leadul." }, { status: 500 });
  }
}
