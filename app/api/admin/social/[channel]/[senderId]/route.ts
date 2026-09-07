import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendSocialReply } from "@/lib/messenger";
import { pauseAssistant } from "@/lib/assistant";
import type { SocialChannel } from "@prisma/client";

interface RouteParams {
  params: Promise<{ channel: string; senderId: string }>;
}

function parseChannel(raw: string): SocialChannel | null {
  return raw === "messenger" || raw === "instagram" ? raw : null;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { channel: raw, senderId } = await params;
  const channel = parseChannel(raw);
  if (!channel) {
    return NextResponse.json({ error: "Canal necunoscut." }, { status: 400 });
  }

  try {
    const messages = await prisma.socialMessage.findMany({
      where: { channel, senderId: decodeURIComponent(senderId) },
      orderBy: { createdAt: "asc" },
      take: 500,
    });
    return NextResponse.json(messages);
  } catch (error) {
    console.error("Error fetching social thread:", error);
    return NextResponse.json({ error: "Failed to fetch thread" }, { status: 500 });
  }
}

// Staff-composed reply. sendSocialReply() decides whether the HUMAN_AGENT tag
// is needed based on how long ago the patient last wrote.
export async function POST(request: Request, { params }: RouteParams) {
  const { channel: raw, senderId } = await params;
  const channel = parseChannel(raw);
  if (!channel) {
    return NextResponse.json({ error: "Canal necunoscut." }, { status: 400 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as { text?: string };
    const text = String(body.text || "").trim();
    if (!text) {
      return NextResponse.json({ error: "Mesajul nu poate fi gol." }, { status: 400 });
    }

    const handle = decodeURIComponent(senderId);
    await sendSocialReply(channel, handle, text);

    // A colleague has taken this conversation over. The assistant keeps out of
    // it for the next couple of hours rather than answering over their head.
    await pauseAssistant(channel, handle, "Răspuns manual din panou").catch(
      (error) => console.warn("Could not pause the assistant:", error),
    );
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error("Error sending social reply:", error);
    const msg = error instanceof Error ? error.message : "Eroare necunoscută";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
