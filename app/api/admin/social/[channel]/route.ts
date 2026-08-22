import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import type { Prisma, SocialChannel } from "@prisma/client";
import { syncSenderNames } from "@/lib/messenger";

interface RouteParams {
  params: Promise<{ channel: string }>;
}

function parseChannel(raw: string): SocialChannel | null {
  return raw === "messenger" || raw === "instagram" ? raw : null;
}

const PAGE_SIZES = [20, 50, 100];

/** How far back to look, as a cutoff or nothing. */
function since(range: string | null): Date | undefined {
  const days: Record<string, number> = { "1d": 1, "7d": 7, "30d": 30, "90d": 90 };
  const n = days[range ?? ""];
  if (!n) return undefined;
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

/**
 * One page of conversations for a channel.
 *
 * The old version read a thousand messages and grouped them in memory, which
 * grew with the inbox and did the same work on every load. Two aggregate
 * queries do it instead: `distinct` on senderId returns the newest message per
 * conversation directly, and a groupBy counts them. Both come back one row per
 * conversation rather than one per message.
 */
export async function GET(request: Request, { params }: RouteParams) {
  const { channel: raw } = await params;
  const channel = parseChannel(raw);
  if (!channel) {
    return NextResponse.json({ error: "Canal necunoscut." }, { status: 400 });
  }

  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const state = url.searchParams.get("state") ?? "all";
  const named = url.searchParams.get("named") ?? "all";
  const range = url.searchParams.get("range");
  const sort = url.searchParams.get("sort") ?? "newest";
  const page = Math.max(Number(url.searchParams.get("page")) || 1, 1);
  const pageSize = PAGE_SIZES.includes(Number(url.searchParams.get("pageSize")))
    ? Number(url.searchParams.get("pageSize"))
    : 20;

  try {
    const cutoff = since(range);
    const where: Prisma.SocialMessageWhereInput = {
      channel,
      ...(cutoff ? { createdAt: { gte: cutoff } } : {}),
      ...(q
        ? {
            OR: [
              { senderName: { contains: q, mode: "insensitive" } },
              { body: { contains: q, mode: "insensitive" } },
              { senderId: { contains: q } },
            ],
          }
        : {}),
    };

    // Newest message per conversation, in one query.
    const latest = await prisma.socialMessage.findMany({
      where,
      orderBy: { createdAt: "desc" },
      distinct: ["senderId"],
      select: {
        senderId: true,
        senderName: true,
        body: true,
        direction: true,
        createdAt: true,
      },
    });

    const counts = await prisma.socialMessage.groupBy({
      by: ["senderId"],
      where,
      _count: { _all: true },
    });
    const countBy = new Map(counts.map((c) => [c.senderId, c._count._all]));

    // A name can sit on an older row than the newest one, so the conversations
    // still missing one are looked up in a single extra query rather than left
    // showing an identifier.
    const unnamed = latest.filter((m) => !m.senderName).map((m) => m.senderId);
    const nameBy = new Map<string, string>();
    if (unnamed.length > 0) {
      const withNames = await prisma.socialMessage.findMany({
        where: { channel, senderId: { in: unnamed }, senderName: { not: null } },
        distinct: ["senderId"],
        select: { senderId: true, senderName: true },
      });
      for (const row of withNames) {
        if (row.senderName) nameBy.set(row.senderId, row.senderName);
      }
    }

    let conversations = latest.map((m) => ({
      senderId: m.senderId,
      senderName: m.senderName ?? nameBy.get(m.senderId) ?? null,
      lastMessage: m.body,
      lastDirection: m.direction,
      lastAt: m.createdAt.toISOString(),
      messageCount: countBy.get(m.senderId) ?? 0,
    }));

    if (state === "unanswered") {
      conversations = conversations.filter((c) => c.lastDirection === "in");
    } else if (state === "answered") {
      conversations = conversations.filter((c) => c.lastDirection === "out");
    }
    if (named === "named") {
      conversations = conversations.filter((c) => c.senderName);
    } else if (named === "unnamed") {
      conversations = conversations.filter((c) => !c.senderName);
    }

    if (sort === "oldest") {
      conversations.reverse();
    } else if (sort === "busiest") {
      conversations.sort((a, b) => b.messageCount - a.messageCount);
    }

    const total = conversations.length;
    const start = (page - 1) * pageSize;

    // Only reached for when something is actually missing a name — it calls
    // Meta, and the inbox should not do that on every load.
    if (unnamed.length > 0 && page === 1) {
      syncSenderNames().catch((error) =>
        console.warn("syncSenderNames failed:", error),
      );
    }

    return NextResponse.json({
      conversations: conversations.slice(start, start + pageSize),
      total,
      page,
      pageSize,
      pageCount: Math.max(Math.ceil(total / pageSize), 1),
      unanswered: latest.filter((m) => m.direction === "in").length,
    });
  } catch (error) {
    console.error("Error fetching social conversations:", error);
    return NextResponse.json(
      { error: "Nu am putut încărca conversațiile." },
      { status: 500 },
    );
  }
}
