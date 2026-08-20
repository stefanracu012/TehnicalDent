// =============================================
// Blog drafting assistance (OpenAI).
//
// Three jobs, all returning the exact shape the admin blog form already uses:
// propose topics, draft a full article, and revise a draft from an instruction.
//
// Nothing here publishes. Drafts come back with isPublished left to the editor,
// because this is dental content — see the editorial rules in SYSTEM below.
//
// Raw fetch rather than the SDK, matching how the Meta, Telegram and translation
// integrations are written.
// =============================================

import prisma from "@/lib/prisma";

const API_KEY = process.env.OPENAI_API_KEY || "";
const MODEL = process.env.OPENAI_MODEL || "gpt-4o";
const ENDPOINT = "https://api.openai.com/v1/chat/completions";

export function isBlogAiConfigured(): boolean {
  return Boolean(API_KEY);
}

/** Categories the admin form offers. Drafts must pick one of these slugs. */
export const CATEGORIES = [
  "igiena-orala",
  "estetica",
  "preventie",
  "copii",
  "nutritie",
  "tratamente",
] as const;

/**
 * Queries Search Console shows the site ranking for on pages 7-10 — real demand
 * the clinic already half-ranks for. Suggestions anchored here beat invented
 * topics, because the audience is measured rather than assumed.
 */
const OPPORTUNITY_QUERIES = [
  "scoatere nerv dinte",
  "nervul dintelui",
  "nerv dentar",
  "scoaterea nervului la masea",
  "periaj dentar corect",
  "igiena orala la copii",
  "гигиена полости рта у детей",
  "reparatii proteze dentare",
];

/**
 * Editorial rules. Dental content is health content: a confident wrong sentence
 * here can cost a reader money or a tooth, and Google judges the whole domain on
 * it. The model informs and routes to a consultation; it never diagnoses.
 */
const SYSTEM = `Ești redactor de conținut pentru TehnicalDent, o clinică stomatologică din Chișinău, sectorul Botanica.

Scrii în română, pentru pacienți fără pregătire medicală.

REGULI OBLIGATORII:
- Informezi, nu diagnostichezi. Nu spui cititorului ce are sau ce tratament îi trebuie.
- Nu dai doze, nu recomanzi medicamente, nu promiți rezultate sau durate de vindecare.
- Nu inventezi statistici, studii, procente sau citate. Dacă nu știi o cifră, scrii fără ea.
- Nu inventezi prețuri și nu descrii dotări sau servicii ale clinicii care nu ți-au fost date.
- Îndemni la consultație pentru orice situație individuală.
- Ton calm și clar. Fără alarmism, fără limbaj de vânzare agresiv.
- Folosești cuvintele pacienților ("scoaterea nervului"), explicând o dată termenul medical ("tratament de canal").
- Diacritice corecte, obligatoriu.`;

interface ChatOptions {
  schemaName: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schema: Record<string, any>;
  user: string;
  temperature?: number;
}

async function chatJson<T>({
  schemaName,
  schema,
  user,
  temperature = 0.7,
}: ChatOptions): Promise<T> {
  if (!isBlogAiConfigured()) {
    throw new Error("OPENAI_API_KEY nu este configurat");
  }

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      temperature,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: user },
      ],
      // Strict schema so the result drops straight into the form with no
      // repair step; a malformed draft is worse than a failed request.
      response_format: {
        type: "json_schema",
        json_schema: { name: schemaName, strict: true, schema },
      },
    }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body?.error?.message || `OpenAI ${res.status}`);
  }

  const content = body?.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenAI a răspuns fără conținut");

  try {
    return JSON.parse(content) as T;
  } catch {
    throw new Error("OpenAI a returnat JSON invalid");
  }
}

/** What the clinic actually treats, so drafts never invent a service. */
async function clinicContext(): Promise<string> {
  const [services, posts] = await Promise.all([
    prisma.service.findMany({
      where: { isActive: true },
      select: { title: true, shortDesc: true },
    }),
    prisma.blogPost.findMany({ select: { title: true } }),
  ]);

  return [
    "Servicii oferite de clinică:",
    ...services.map((s) => `- ${s.title}: ${s.shortDesc}`),
    "",
    "Articole care există deja pe blog (nu le repeta):",
    ...posts.map((p) => `- ${p.title}`),
  ].join("\n");
}

// ── Topic suggestions ───────────────────────────────────────────────────────

export interface TopicIdea {
  title: string;
  angle: string;
  category: string;
  targetQuery: string;
}

export async function suggestTopics(count = 6): Promise<TopicIdea[]> {
  const context = await clinicContext();

  const { topics } = await chatJson<{ topics: TopicIdea[] }>({
    schemaName: "topic_ideas",
    temperature: 0.9,
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["topics"],
      properties: {
        topics: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["title", "angle", "category", "targetQuery"],
            properties: {
              title: { type: "string" },
              angle: { type: "string" },
              category: { type: "string", enum: [...CATEGORIES] },
              targetQuery: { type: "string" },
            },
          },
        },
      },
    },
    user: `${context}

Căutări pentru care site-ul apare deja în Google, dar pe pagina 7-10 — cerere reală, nevalorificată:
${OPPORTUNITY_QUERIES.map((q) => `- ${q}`).join("\n")}

Propune ${count} subiecte de articol. Prioritizează subiectele care răspund căutărilor de mai sus, apoi subiecte legate de serviciile clinicii.

Pentru fiecare: un titlu pe care l-ar da click un pacient, unghiul abordării într-o propoziție, categoria potrivită și căutarea principală vizată.`,
  });

  return topics;
}

// ── Full draft ──────────────────────────────────────────────────────────────

export interface DraftSection {
  title: string;
  text: string;
}

export interface ArticleDraft {
  title: string;
  excerpt: string;
  category: string;
  tags: string[];
  metaTitle: string;
  metaDescription: string;
  facebookCaption: string;
  instagramCaption: string;
  sections: DraftSection[];
}

/** Shared by drafting and revision so the two can never drift apart. */
const ARTICLE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "title",
    "excerpt",
    "category",
    "tags",
    "metaTitle",
    "metaDescription",
    "facebookCaption",
    "instagramCaption",
    "sections",
  ],
  properties: {
    title: { type: "string" },
    excerpt: { type: "string" },
    category: { type: "string", enum: [...CATEGORIES] },
    tags: { type: "array", items: { type: "string" } },
    metaTitle: { type: "string" },
    metaDescription: { type: "string" },
    facebookCaption: { type: "string" },
    instagramCaption: { type: "string" },
    sections: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "text"],
        properties: {
          title: { type: "string" },
          text: { type: "string" },
        },
      },
    },
  },
};

/**
 * Written once and appended to both prompts. The city belongs in the search
 * snippet because the clinic competes locally, and the captions are separated
 * because Facebook renders links while Instagram shows them as dead text.
 *
 * The calls to action are added at publish time, not written by the model —
 * see lib/social-publish.ts — so the captions must stop before them.
 */
const OUTPUT_RULES = `
Titlu și rezumat (pentru pagină):
- Titlu sub 60 de caractere, conținând termenul pe care îl caută pacienții.
- Rezumat (excerpt) de 140-160 de caractere, care spune concret ce află cititorul.

SEO (pentru Google):
- metaTitle: maximum 55 de caractere, cu termenul căutat la început. Nu adăuga numele clinicii — se adaugă automat.
- metaDescription: OBLIGATORIU între 140 și 155 de caractere. Numără caracterele înainte să răspunzi. Sub 140 pierzi spațiu în rezultatele Google, peste 155 se taie.
  Ca să ajungi la lungime, include toate trei: ce află concret cititorul, un beneficiu practic, și mențiunea Chișinău. Dacă textul iese mai scurt, adaugă încă un detaliu util — nu umple cu vorbe goale.
- Poate să difere de titlu și rezumat: un H1 bun se citește altfel decât un titlu bun în Google.

Text (pentru cititor):
- 4-6 secțiuni, fiecare cu titlu de subcapitol și 2-4 paragrafe.
- Prima secțiune răspunde direct la întrebarea din titlu, în primele două propoziții.
- Include o secțiune de întrebări frecvente dacă subiectul o justifică.
- Ultima secțiune îndeamnă la consultație, fără presiune.
- 4-8 etichete (tags) scurte, cu litere mici.
- Text simplu, fără Markdown, fără HTML. Paragrafele se despart prin linie goală.

Facebook (facebookCaption):
- 3-5 propoziții. Începe cu o observație sau o întrebare care oprește derularea.
- Ton de conversație, nu de comunicat de presă.
- Nu pune linkuri și nu pune îndemn la programare — se adaugă automat la final.
- Fără hashtag-uri.

Instagram (instagramCaption):
- Prima propoziție trebuie să funcționeze singură — restul e ascuns după "mai mult".
- 4-6 propoziții scurte, cu linie goală între idei.
- Nu pune linkuri (Instagram nu le face clicabile) și nu pune îndemn — se adaugă automat.
- Nu pune hashtag-uri; se generează din etichete.`;

export async function generateArticle(
  topic: string,
  category?: string,
): Promise<ArticleDraft> {
  const context = await clinicContext();

  return chatJson<ArticleDraft>({
    schemaName: "article_draft",
    schema: ARTICLE_SCHEMA,
    user: `${context}

Scrie un articol complet pe subiectul: "${topic}"${category ? `\nCategoria: ${category}` : ""}
${OUTPUT_RULES}`,
  });
}

// ── Revision ────────────────────────────────────────────────────────────────

export async function reviseArticle(
  current: ArticleDraft,
  instruction: string,
): Promise<ArticleDraft> {
  return chatJson<ArticleDraft>({
    schemaName: "article_draft",
    temperature: 0.5,
    schema: ARTICLE_SCHEMA,
    user: `Articolul curent, în JSON:

${JSON.stringify(current, null, 2)}

Instrucțiunea editorului: "${instruction}"

Aplică exact ce cere instrucțiunea și returnează articolul întreg, în aceeași structură. Nu rescrie părțile care nu sunt vizate de instrucțiune — păstrează-le cuvânt cu cuvânt.

Dacă modificarea schimbă subiectul sau titlul, actualizează în consecință metaTitle, metaDescription și textele pentru Facebook și Instagram, respectând regulile:
${OUTPUT_RULES}`,
  });
}
