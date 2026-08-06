import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import type { SocialChannel } from "@prisma/client";

interface RouteParams {
  params: Promise<{ channel: string }>;
}

function parseChannel(raw: string): SocialChannel | null {
  return raw === "messenger" || raw === "instagram" ? raw : null;
}

// Conversation list for one channel: newest message per sender.
export async function GET(_request: Request, { params }: RouteParams) {
  const { channel: raw } = await params;
  const channel = parseChannel(raw);
  if (!channel) {
    return NextResponse.json({ error: "Canal necunoscut." }, { status: 400 });
  }

  try {
    const messages = await prisma.socialMessage.findMany({
      where: { channel },
      orderBy: { createdAt: "desc" },
      take: 1000,
    });

    // Grouped in memory rather than by aggregation: a single clinic's inbox
    // is small, and this keeps the query trivially correct.
    const bySender = new Map<
      string,
      {
        senderId: string;
        senderName: string | null;
        lastMessage: string;
        lastDirection: "in" | "out";
        lastAt: string;
        inboundCount: number;
      }
    >();

    for (const m of messages) {
      const existing = bySender.get(m.senderId);
      if (!existing) {
        bySender.set(m.senderId, {
          senderId: m.senderId,
          senderName: m.senderName,
          lastMessage: m.body,
          lastDirection: m.direction,
          lastAt: m.createdAt.toISOString(),
          inboundCount: m.direction === "in" ? 1 : 0,
        });
      } else if (m.direction === "in") {
        existing.inboundCount += 1;
      }
    }

    return NextResponse.json(Array.from(bySender.values()));
  } catch (error) {
    console.error("Error fetching social conversations:", error);
    return NextResponse.json({ error: "Failed to fetch conversations" }, { status: 500 });
  }
}
