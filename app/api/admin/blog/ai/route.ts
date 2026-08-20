import { NextResponse } from "next/server";
import {
  isBlogAiConfigured,
  suggestTopics,
  generateArticle,
  reviseArticle,
  type ArticleDraft,
} from "@/lib/blog-ai";

// One endpoint for all three drafting actions. The permission middleware keys
// off the first path segment, so this inherits "blog:create" from /api/admin/blog
// without any extra mapping. A static "ai" segment wins over [id] in routing.

export async function POST(request: Request) {
  if (!isBlogAiConfigured()) {
    return NextResponse.json(
      { error: "Asistentul AI nu este configurat (OPENAI_API_KEY)." },
      { status: 503 },
    );
  }

  try {
    const body = await request.json();

    switch (body.action) {
      case "suggest": {
        const topics = await suggestTopics(
          Math.min(Math.max(Number(body.count) || 6, 1), 10),
        );
        return NextResponse.json({ topics });
      }

      case "generate": {
        if (!body.topic?.trim()) {
          return NextResponse.json(
            { error: "Lipsește subiectul articolului." },
            { status: 400 },
          );
        }
        const draft = await generateArticle(body.topic.trim(), body.category);
        return NextResponse.json({ draft });
      }

      case "revise": {
        if (!body.instruction?.trim()) {
          return NextResponse.json(
            { error: "Lipsește instrucțiunea de modificare." },
            { status: 400 },
          );
        }
        if (!body.current) {
          return NextResponse.json(
            { error: "Lipsește articolul de modificat." },
            { status: 400 },
          );
        }
        const draft = await reviseArticle(
          body.current as ArticleDraft,
          body.instruction.trim(),
        );
        return NextResponse.json({ draft });
      }

      default:
        return NextResponse.json(
          { error: "Acțiune necunoscută." },
          { status: 400 },
        );
    }
  } catch (error) {
    // The message carries OpenAI's own wording (quota, rate limit, content
    // filter), which is what the editor needs to see to know what to do next.
    console.error("Blog AI failed:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Asistentul AI a eșuat." },
      { status: 502 },
    );
  }
}
