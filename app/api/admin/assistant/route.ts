import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sanitizeObject, validateNoInjection } from "@/lib/security";
import { isAssistantConfigured } from "@/lib/assistant";
import type { AssistantMode } from "@prisma/client";

const CHANNELS = ["whatsapp", "messenger", "instagram"] as const;
const MODES = ["oprit", "selectat", "toti"];

type Channel = (typeof CHANNELS)[number];

/** Recent conversations, so a channel can be switched on for one person by name. */
async function candidates(): Promise<
  { channel: Channel; handle: string; label: string; lastMessage: string }[]
> {
  const [whatsapp, social] = await Promise.all([
    prisma.whatsAppMessage.findMany({
      where: { direction: "in" },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: { phone: true, body: true, patient: { select: { name: true } } },
    }),
    prisma.socialMessage.findMany({
      where: { direction: "in" },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: { channel: true, senderId: true, senderName: true, body: true },
    }),
  ]);

  const seen = new Set<string>();
  const out: { channel: Channel; handle: string; label: string; lastMessage: string }[] = [];

  for (const m of whatsapp) {
    const key = `whatsapp:${m.phone}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      channel: "whatsapp",
      handle: m.phone,
      label: m.patient?.name || m.phone,
      lastMessage: m.body.slice(0, 80),
    });
  }

  for (const m of social) {
    const key = `${m.channel}:${m.senderId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      channel: m.channel as Channel,
      handle: m.senderId,
      label: m.senderName || m.senderId,
      lastMessage: m.body.slice(0, 80),
    });
  }

  return out.slice(0, 100);
}

export async function GET() {
  try {
    const rows = await prisma.assistantChannel.findMany();
    const channels = Object.fromEntries(
      CHANNELS.map((c) => [c, rows.find((r) => r.channel === c)?.mode ?? "oprit"]),
    );

    return NextResponse.json({
      channels,
      allowed: await prisma.assistantAllowed.findMany({
        orderBy: { createdAt: "desc" },
      }),
      candidates: await candidates(),
      configured: isAssistantConfigured(),
    });
  } catch (error) {
    console.error("Error reading assistant settings:", error);
    return NextResponse.json(
      { error: "Nu am putut citi setările." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const raw = await request.json();
    if (!validateNoInjection(raw)) {
      return NextResponse.json({ error: "Input invalid." }, { status: 400 });
    }
    const body = sanitizeObject(raw, []);

    const channel = String(body.channel ?? "");
    if (!CHANNELS.includes(channel as Channel)) {
      return NextResponse.json({ error: "Canal necunoscut." }, { status: 400 });
    }

    if (body.action === "mode") {
      const mode = String(body.mode ?? "");
      if (!MODES.includes(mode)) {
        return NextResponse.json({ error: "Mod necunoscut." }, { status: 400 });
      }
      const saved = await prisma.assistantChannel.upsert({
        where: { channel },
        create: { channel, mode: mode as AssistantMode },
        update: { mode: mode as AssistantMode },
      });
      return NextResponse.json(saved);
    }

    if (body.action === "allow") {
      const handle = String(body.handle ?? "").trim();
      if (!handle) {
        return NextResponse.json(
          { error: "Lipsește conversația." },
          { status: 400 },
        );
      }
      const saved = await prisma.assistantAllowed.upsert({
        where: { channel_handle: { channel, handle } },
        create: { channel, handle, label: body.label || null },
        update: { label: body.label || null },
      });
      return NextResponse.json(saved, { status: 201 });
    }

    return NextResponse.json({ error: "Acțiune necunoscută." }, { status: 400 });
  } catch (error) {
    console.error("Error saving assistant settings:", error);
    return NextResponse.json({ error: "Nu am putut salva." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Lipsește id-ul." }, { status: 400 });
  }
  try {
    await prisma.assistantAllowed.delete({ where: { id } });
    return NextResponse.json({ message: "Scos" });
  } catch (error) {
    console.error("Error removing allowed conversation:", error);
    return NextResponse.json({ error: "Nu am putut scoate." }, { status: 500 });
  }
}
