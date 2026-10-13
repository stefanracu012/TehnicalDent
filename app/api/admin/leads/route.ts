import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sanitizeObject, validateNoInjection } from "@/lib/security";
import { normalisePhone } from "@/lib/leads";
import {
  CLOSED_STATUSES,
  LEAD_SOURCE_VALUES,
  LEAD_STATUS_VALUES,
} from "@/lib/leads-config";
import type { LeadSource, LeadStatus, Prisma } from "@prisma/client";

const PAGE_SIZES = [25, 50, 100];

const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

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

    // Follow-up, by day: "overdue" means before today, not before this minute.
    const today = startOfDay(new Date());
    const tomorrow = new Date(today.getTime() + 86_400_000);
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
    if (period === "today") created.gte = today;
    else if (period === "yesterday") {
      created.gte = new Date(today.getTime() - 86_400_000);
      created.lt = today;
    } else if (period === "week") {
      const monday = new Date(today);
      monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
      created.gte = monday;
    } else if (period === "month") {
      created.gte = new Date(today.getFullYear(), today.getMonth(), 1);
    } else if (period === "prev-month") {
      created.gte = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      created.lt = new Date(today.getFullYear(), today.getMonth(), 1);
    } else if (period === "interval") {
      if (from) created.gte = new Date(from);
      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        created.lte = end;
      }
    }
    if (Object.keys(created).length) where.createdAt = created;

    const q = (params.get("q") ?? "").trim();
    if (q) {
      const digits = q.replace(/\D/g, "").replace(/^(373|0)/, "");
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
        followUpAt: body.followUpAt ? new Date(body.followUpAt as string) : null,
        assignedToId: (body.assignedToId as string) || null,
      },
    });

    return NextResponse.json(lead, { status: 201 });
  } catch (error) {
    console.error("Error creating lead:", error);
    return NextResponse.json({ error: "Nu am putut crea leadul." }, { status: 500 });
  }
}
