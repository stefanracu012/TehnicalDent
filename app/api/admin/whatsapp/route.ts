import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export interface WhatsAppConversation {
  phone: string;
  patientName: string | null;
  lastMessage: string;
  lastDirection: "in" | "out";
  lastAt: string;
  unread: number;
}

// Groups the flat WhatsAppMessage log into one row per phone number,
// newest conversation first — there's no separate "Conversation" model,
// messages are grouped in-memory since volume is low (single-clinic inbox).
export async function GET() {
  try {
    const messages = await prisma.whatsAppMessage.findMany({
      orderBy: { createdAt: "desc" },
      take: 1000,
      include: { patient: { select: { name: true } } },
    });

    const byPhone = new Map<string, WhatsAppConversation>();
    for (const m of messages) {
      const existing = byPhone.get(m.phone);
      if (!existing) {
        byPhone.set(m.phone, {
          phone: m.phone,
          patientName: m.patient?.name ?? null,
          lastMessage: m.body,
          lastDirection: m.direction,
          lastAt: m.createdAt.toISOString(),
          unread: m.direction === "in" ? 1 : 0,
        });
      } else if (m.direction === "in") {
        existing.unread += 1;
      }
    }

    return NextResponse.json(Array.from(byPhone.values()));
  } catch (error) {
    console.error("Error fetching WhatsApp conversations:", error);
    return NextResponse.json({ error: "Failed to fetch conversations" }, { status: 500 });
  }
}
