import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";
import { sanitizeString, validateNoInjection } from "@/lib/security";

/** A lead's notes, newest first. */
export async function GET(request: Request) {
  const leadId = new URL(request.url).searchParams.get("leadId");
  if (!leadId) {
    return NextResponse.json({ error: "Lipsește leadId." }, { status: 400 });
  }

  try {
    const notes = await prisma.leadNote.findMany({
      where: { leadId },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return NextResponse.json(notes);
  } catch (error) {
    console.error("Error fetching lead notes:", error);
    return NextResponse.json({ error: "Nu am putut încărca notițele." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      leadId?: string;
      content?: string;
    };
    if (!validateNoInjection(body)) {
      return NextResponse.json({ error: "Input invalid detectat." }, { status: 400 });
    }

    const content = sanitizeString(String(body.content ?? "")).trim();
    if (!body.leadId || !content) {
      return NextResponse.json({ error: "Notița nu poate fi goală." }, { status: 400 });
    }

    const session = await getSession();
    const note = await prisma.leadNote.create({
      data: {
        leadId: body.leadId,
        content: content.slice(0, 2000),
        authorName: session?.name ?? null,
      },
    });
    return NextResponse.json(note, { status: 201 });
  } catch (error) {
    console.error("Error creating lead note:", error);
    return NextResponse.json({ error: "Nu am putut salva notița." }, { status: 500 });
  }
}
