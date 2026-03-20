import { NextResponse } from "next/server";

const TARGET_LOCALES = ["en", "ru", "it"];

async function translateChunk(
  text: string,
  targetLang: string,
): Promise<string> {
  if (!text.trim()) return "";

  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=ro&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Translation API returned ${res.status}`);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = await res.json();
  if (!data?.[0]) return text;

  return data[0]
    .filter((s: unknown[]) => s?.[0])
    .map((s: unknown[]) => s[0])
    .join("");
}

async function translateText(
  text: string,
  targetLang: string,
): Promise<string> {
  if (!text.trim()) return "";

  // Google Translate GET has URL length limits — split long texts by paragraphs
  if (text.length <= 3000) {
    return translateChunk(text, targetLang);
  }

  const paragraphs = text.split("\n");
  const chunks: string[] = [];
  let current = "";

  for (const para of paragraphs) {
    if ((current + "\n" + para).length > 3000 && current) {
      chunks.push(current);
      current = para;
    } else {
      current = current ? current + "\n" + para : para;
    }
  }
  if (current) chunks.push(current);

  // Translate chunks sequentially to avoid rate limiting
  const results: string[] = [];
  for (const chunk of chunks) {
    results.push(await translateChunk(chunk, targetLang));
  }
  return results.join("\n");
}

export async function POST(request: Request) {
  try {
    const { fields } = await request.json();

    if (!fields || typeof fields !== "object") {
      return NextResponse.json({ error: "Input invalid" }, { status: 400 });
    }

    const result: Record<string, Record<string, string | string[]>> = {};

    // Translate locales sequentially, fields in parallel within each locale
    for (const locale of TARGET_LOCALES) {
      result[locale] = {};

      await Promise.all(
        Object.entries(fields).map(async ([key, value]) => {
          if (typeof value === "string" && value.trim()) {
            result[locale][key] = await translateText(value, locale);
          } else if (Array.isArray(value)) {
            result[locale][key] = await Promise.all(
              (value as string[]).map((item) =>
                typeof item === "string" && item.trim()
                  ? translateText(item, locale)
                  : Promise.resolve(""),
              ),
            );
          }
        }),
      );
    }

    return NextResponse.json({ translations: result });
  } catch (error) {
    console.error("Translation error:", error);
    return NextResponse.json(
      { error: "Eroare la traducere" },
      { status: 500 },
    );
  }
}
