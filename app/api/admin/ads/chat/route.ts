import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
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
      return NextResponse.json(
        { error: "Scrie o întrebare." },
        { status: 400 },
      );
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

    return NextResponse.json({
      answer,
      basedOn: snapshot.fetchedAt,
    });
  } catch (error) {
    console.error("Ads chat failed:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Asistentul a eșuat." },
      { status: 502 },
    );
  }
}
