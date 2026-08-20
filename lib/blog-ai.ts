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

/** Editor-chosen shape of the draft. Everything is optional; defaults below. */
export interface DraftOptions {
  category?: string;
  length?: "scurt" | "mediu" | "lung";
  tone?: "informativ" | "cald" | "profesional";
  includeFaq?: boolean;
  includeMyths?: boolean;
  includeWarnings?: boolean;
  includePrices?: boolean;
  avoid?: string;
}

const LENGTHS: Record<string, string> = {
  scurt: "3-4 secțiuni, fiecare cu 2 paragrafe",
  mediu: "4-6 secțiuni, fiecare cu 2-4 paragrafe",
  lung: "7-9 secțiuni, fiecare cu 3-4 paragrafe",
};

const TONES: Record<string, string> = {
  informativ: "Ton neutru și explicativ, ca o fișă de informare.",
  cald: "Ton cald și liniștitor, potrivit pentru pacienți anxioși.",
  profesional: "Ton profesional și concis, potrivit pentru cititori informați.",
};

/** Turns the editor's checkboxes into instructions the model can follow. */
function optionRules(opts: DraftOptions): string {
  const lines: string[] = [
    `- ${LENGTHS[opts.length ?? "mediu"]}.`,
    `- ${TONES[opts.tone ?? "informativ"]}`,
  ];

  if (opts.includeFaq) {
    lines.push("- Include o secțiune de întrebări frecvente, cu 4-6 întrebări scurte și răspunsurile lor.");
  }
  if (opts.includeMyths) {
    lines.push("- Include o secțiune care combate miturile răspândite despre acest subiect.");
  }
  if (opts.includeWarnings) {
    lines.push("- Include o secțiune cu semnalele care cer o vizită urgentă la medic. Descrie simptomele, fără să spui cititorului ce boală are.");
  }
  // Off by default: prices change, and a stale number in an article is worse
  // than no number. Only mention them in general terms when asked.
  lines.push(
    opts.includePrices
      ? "- Poți vorbi despre costuri doar în termeni generali (ce influențează prețul), niciodată cu sume concrete."
      : "- Nu menționa deloc costuri sau prețuri.",
  );
  if (opts.avoid?.trim()) {
    lines.push(`- De evitat, la cererea editorului: ${opts.avoid.trim()}`);
  }

  return lines.join("\n");
}

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
- Fiecare secțiune are titlu de subcapitol.
- Prima secțiune răspunde direct la întrebarea din titlu, în primele două propoziții.
- Ultima secțiune îndeamnă la consultație, fără presiune.
- 4-8 etichete (tags) scurte, cu litere mici.
- Paragrafele se despart prin linie goală. Fără HTML.
- Poți încadra un cuvânt sau o întrebare între ** ** pentru a o îngroșa; site-ul o afișează îngroșat. Niciun alt Markdown: fără #, fără liste cu -, fără linkuri.

Facebook (facebookCaption):
- 3-5 propoziții. Începe cu o observație sau o întrebare care oprește derularea.
- Ton de conversație, nu de comunicat de presă.
- Nu pune linkuri și nu pune îndemn la programare — se adaugă automat la final.
- Fără hashtag-uri și fără Markdown: rețelele afișează ** ** ca asteriscuri.

Instagram (instagramCaption):
- Prima propoziție trebuie să funcționeze singură — restul e ascuns după "mai mult".
- 4-6 propoziții scurte, cu linie goală între idei.
- Nu pune linkuri (Instagram nu le face clicabile) și nu pune îndemn — se adaugă automat.
- Nu pune hashtag-uri; se generează din etichete.`;

export async function generateArticle(
  topic: string,
  opts: DraftOptions = {},
): Promise<ArticleDraft> {
  const context = await clinicContext();

  return chatJson<ArticleDraft>({
    schemaName: "article_draft",
    schema: ARTICLE_SCHEMA,
    user: `${context}

Scrie un articol complet pe subiectul: "${topic}"${opts.category ? `\nCategoria: ${opts.category}` : ""}

Cerințe alese de editor:
${optionRules(opts)}
${OUTPUT_RULES}`,
  });
}

// ── Standalone social posts ─────────────────────────────────────────────────

export interface SocialPostDraft {
  title: string;
  facebookCaption: string;
  instagramCaption: string;
  tags: string[];
}

export interface SocialPostOptions {
  tone?: "informativ" | "cald" | "profesional";
  length?: "scurt" | "mediu" | "lung";
  carouselSlides?: number;
  askQuestion?: boolean;
  avoid?: string;
}

const POST_LENGTHS: Record<string, string> = {
  scurt: "3-4 propoziții scurte",
  mediu: "6-8 propoziții, grupate în 2-3 paragrafe",
  lung: "10-14 propoziții, grupate în 4-5 paragrafe scurte",
};

/**
 * Copy for a post that lives only on Facebook and Instagram.
 *
 * Longer than the teaser written for an article, because there is nothing to
 * click through to — the caption has to carry the whole idea by itself.
 */
export async function generateSocialPost(
  topic: string,
  opts: SocialPostOptions = {},
): Promise<SocialPostDraft> {
  const context = await clinicContext();
  const slides = opts.carouselSlides ?? 1;

  return chatJson<SocialPostDraft>({
    schemaName: "social_post",
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["title", "facebookCaption", "instagramCaption", "tags"],
      properties: {
        title: { type: "string" },
        facebookCaption: { type: "string" },
        instagramCaption: { type: "string" },
        tags: { type: "array", items: { type: "string" } },
      },
    },
    user: `${context}

Scrie o postare pentru rețelele sociale despre: "${topic}"

Aceasta NU este un articol de blog. Nu există pagină pe site în spatele ei, deci textul trebuie să spună tot ce are de spus singur.

Cerințe:
- ${POST_LENGTHS[opts.length ?? "mediu"]}.
- ${TONES[opts.tone ?? "cald"]}
${slides > 1 ? `- Textul însoțește un carusel de ${slides} imagini. Structurează-l ca ${slides} idei distincte, în ordine, câte una pentru fiecare imagine.\n` : ""}${opts.askQuestion ? "- Termină cu o întrebare care invită la comentarii.\n" : ""}${opts.avoid?.trim() ? `- De evitat: ${opts.avoid.trim()}\n` : ""}- title: o etichetă scurtă în limbaj normal, cu spații și majusculă la început, ca un titlu de rând într-o listă. Exemplu: "Obiceiuri care pătează dinții". Fără underscore, fără cratime, fără litere lipite. Nu se publică nicăieri.

facebookCaption și instagramCaption sunt DOUĂ texte diferite. Nu copia unul în celălalt și nu le face aproape la fel — sunt platforme cu obiceiuri diferite de citire:
- facebookCaption: paragrafe curgătoare, ton de conversație, ca și cum ai explica unui pacient în cabinet. Poate fi mai lung și mai explicativ.
- instagramCaption: prima propoziție trebuie să funcționeze complet singură, fiindcă restul se ascunde după „mai mult". Apoi propoziții scurte, cu linie goală între idei. Mai direct și mai tăiat decât varianta de Facebook.

- Niciun link și niciun îndemn la programare în text — se adaugă automat la final.
- Fără hashtag-uri și fără Markdown în text; rețelele afișează ** ** ca asteriscuri. Pune 4-8 etichete în tags, cu litere mici.`,
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
