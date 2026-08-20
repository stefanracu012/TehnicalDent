import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";
import type { AdsReport } from "@/lib/meta-ads";
import {
  answerAdsQuestion,
  isAdsAiConfigured,
  type ChatTurn,
} from "@/lib/ads-ai";

// Under /api/admin/ads, so it inherits the "reclame" permission. The POST
// override maps it to "reclame:edit" — asking a question changes nothing, but
// it does spend an OpenAI call, so it sits behind the same gate as refreshing
// rather than being free to every reader.

/** The kept thread, oldest first, so the panel reads top to bottom. */
export async function GET() {
  try {
    const entries = await prisma.adsChatEntry.findMany({
      orderBy: { createdAt: "asc" },
      take: 100,
    });
    return NextResponse.json({ entries });
  } catch (error) {
    console.error("Error reading ads chat:", error);
    return NextResponse.json(
      { error: "Nu am putut citi istoricul." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  if (!isAdsAiConfigured()) {
    return NextResponse.json(
      { error: "Asistentul nu este configurat (OPENAI_API_KEY)." },
      { status: 503 },
    );
  }

  try {
    const body = await request.json();
    const question = String(body.question ?? "").trim();

    if (!question) {
      return NextResponse.json({ error: "Scrie o întrebare." }, { status: 400 });
    }
    if (question.length > 500) {
      return NextResponse.json(
        { error: "Întrebarea e prea lungă." },
        { status: 400 },
      );
    }

    // Answers come from the stored snapshot, never a fresh pull: the question
    // box would otherwise be an unmetered path to the Meta API, sidestepping
    // the refresh limit entirely.
    const snapshot = await prisma.adsSnapshot.findFirst({
      orderBy: { fetchedAt: "desc" },
    });
    if (!snapshot) {
      return NextResponse.json(
        { error: "Nu există încă un raport. Apasă Reîmprospătează întâi." },
        { status: 404 },
      );
    }

    const history: ChatTurn[] = Array.isArray(body.history)
      ? body.history
          .filter(
            (t: unknown): t is ChatTurn =>
              typeof t === "object" &&
              t !== null &&
              ["user", "assistant"].includes((t as ChatTurn).role) &&
              typeof (t as ChatTurn).content === "string",
          )
          .slice(-6)
      : [];

    const answer = await answerAdsQuestion(
      snapshot.data as unknown as AdsReport,
      question,
      history,
    );

    const session = await getSession();
    const entry = await prisma.adsChatEntry.create({
      data: {
        question,
        answer,
        basedOn: snapshot.fetchedAt,
        askedBy: session?.email ?? null,
      },
    });

    return NextResponse.json({ entry });
  } catch (error) {
    console.error("Ads chat failed:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Asistentul a eșuat." },
      { status: 502 },
    );
  }
}

/**
 * Deletes one entry by id, or the whole thread with ?all=true.
 *
 * Clearing everything needs that explicit flag: a DELETE with a mistyped id
 * should come back empty-handed, not wipe the history.
 */
export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const all = url.searchParams.get("all") === "true";

  try {
    if (all) {
      const { count } = await prisma.adsChatEntry.deleteMany({});
      return NextResponse.json({ deleted: count });
    }
    if (!id) {
      return NextResponse.json(
        { error: "Lipsește id-ul mesajului." },
        { status: 400 },
      );
    }
    await prisma.adsChatEntry.delete({ where: { id } });
    return NextResponse.json({ deleted: 1 });
  } catch (error) {
    console.error("Error deleting ads chat:", error);
    return NextResponse.json(
      { error: "Nu am putut șterge." },
      { status: 500 },
    );
  }
}
