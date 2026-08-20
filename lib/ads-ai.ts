// =============================================
// Reading the ads report back in plain Romanian.
//
// The numbers are on the page already; this explains what they mean and what to
// do about them. Structured rather than prose so the page can rank findings by
// severity instead of printing a wall of text.
// =============================================

import {
  INSIGHT_ENUMS,
  queryInsights,
  listStructure,
  getAdCreatives,
  type AdsReport,
} from "@/lib/meta-ads";

const API_KEY = process.env.OPENAI_API_KEY || "";
const MODEL = process.env.OPENAI_MODEL || "gpt-4o";
const ENDPOINT = "https://api.openai.com/v1/chat/completions";

export interface AdsFinding {
  title: string;
  detail: string;
  severity: "good" | "warn" | "bad";
}

export interface AdsAnalysis {
  headline: string;
  findings: AdsFinding[];
  actions: { title: string; detail: string }[];
  caveats: string[];
}

/**
 * The analyst brief.
 *
 * Two things it is told repeatedly, because both are easy to get wrong and
 * expensive when wrong: a cheap contact is not the same as a profitable one
 * without knowing what a treatment is worth, and a difference built on three
 * conversions is noise rather than a finding.
 */
const SYSTEM = `Ești analist de publicitate pentru TehnicalDent, o clinică stomatologică din Chișinău.

Primești datele reale ale contului de reclame Meta și explici proprietarului ce se întâmplă, în română, fără jargon.

REGULI:
- Explici DE CE, nu doar CE. "Reclama X e scumpă" nu ajută; "X costă de șase ori mai mult per contact decât Y, deși ambele promovează servicii similare" ajută.
- Un contact ieftin NU înseamnă profit. Nu știi cât valorează un tratament, deci nu spui niciodată că o reclamă e „mai profitabilă" — spui că aduce contacte mai ieftin, și menționezi că valoarea tratamentului lipsește din calcul.
- Diferențele bazate pe mai puțin de 10 conversii sunt zgomot, nu concluzii. Le marchezi explicit ca incerte.
- Nu inventezi cifre. Folosești doar ce primești.
- Nu recomanzi niciodată creșteri de buget fără să spui de la cât la cât și pe ce bază.
- Ton direct și calm. Fără entuziasm de agenție.
- severity: "good" pentru ce merge, "warn" pentru ce e nesigur sau merită verificat, "bad" pentru bani cheltuiți fără rezultat.`;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["headline", "findings", "actions", "caveats"],
  properties: {
    headline: { type: "string" },
    findings: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "detail", "severity"],
        properties: {
          title: { type: "string" },
          detail: { type: "string" },
          severity: { type: "string", enum: ["good", "warn", "bad"] },
        },
      },
    },
    actions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "detail"],
        properties: {
          title: { type: "string" },
          detail: { type: "string" },
        },
      },
    },
    caveats: { type: "array", items: { type: "string" } },
  },
};

export function isAdsAiConfigured(): boolean {
  return Boolean(API_KEY);
}

/**
 * Grounding rules for the question box.
 *
 * The whole report travels in the prompt, so every figure the assistant needs is
 * in front of it — which makes inventing one inexcusable rather than merely
 * unlucky. It is told to quote what it used and to refuse rather than estimate,
 * because a confident wrong number here would be acted on with real money.
 */
const CHAT_SYSTEM = `Ești analistul contului de reclame Meta al clinicii TehnicalDent din Chișinău.

Ai acces direct la contul de reclame prin unelte de citire. Răspunzi la întrebări în română.

REGULI ABSOLUTE:
- Ai unelte care interoghează contul de reclame în direct. Folosește-le. Nu ghici o cifră pe care o poți cere.
- Răspunzi EXCLUSIV pe baza cifrelor primite din unelte sau din totalurile date. Nu folosești cunoștințe generale despre publicitate ca să completezi cifre.
- Dacă nici uneltele nu pot afla ceva, spui direct ce lipsește și de ce.
- Nu estimezi și nu aproximezi cifre. Dacă un calcul e posibil din datele existente, îl faci și arăți din ce l-ai obținut.
- Când dai o cifră, spui de unde vine: "Igienizare, 13 contacte la 66,03 USD" e util; "aproximativ 5 dolari" nu e.
- Diferențele bazate pe mai puțin de 10 conversii sunt zgomot. Le marchezi ca incerte de fiecare dată.
- Un contact ieftin nu înseamnă profit. Nu știi cât valorează un tratament, deci nu numești nimic "profitabil".

CUM SCRII — se citește pe telefon, ca un mesaj, nu ca un raport:
- Prima propoziție ESTE răspunsul. Fără introduceri de tipul "Din datele disponibile observăm că" sau "Este important de menționat".
- Propoziții scurte. O idee pe rând.
- Linie goală între idei. Nu paragrafe lungi.
- Maximum 70 de cuvinte, dacă întrebarea nu cere explicit mai mult.
- Cifrele intră în propoziție, scurt: "Igienizare, 13 contacte la 5,06 USD bucata".
- Dacă e o rezervă importantă, o pui la final, într-un singur rând scurt.
- Fără Markdown: nici **, nici #, nici liste cu -.

Exemplu de ton corect:
"Da, dar cu prudență.

Igienizare aduce un contact la 5,06 USD. Coroanele, la 13,97 și 17,79.

Diferența e reală — 13 contacte nu e puțin.

Doar că nu știm cât valorează un pacient de coroane față de unul de igienizare. Dacă unul de coroane aduce de trei ori mai mult, calculul se schimbă."`;

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

/**
 * What the assistant can ask Meta.
 *
 * Every parameter is an enum, so the model picks between prepared questions
 * rather than composing a request. There is no tool that writes, and no tool
 * that takes a path — read-only holds regardless of what it is asked to do.
 */
const TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "get_insights",
      description:
        "Cifre de performanță direct din contul de reclame: cheltuit, afișări, clicuri, CTR, conversații pornite, contacte, cost pe contact și cost pe conversație. Folosește-l pentru orice întrebare despre rezultate.",
      parameters: {
        type: "object",
        additionalProperties: false,
        required: ["level", "datePreset"],
        properties: {
          level: {
            type: "string",
            enum: [...INSIGHT_ENUMS.levels],
            description:
              "account pentru total, campaign pentru campanii, adset pentru seturi, ad pentru fiecare reclamă.",
          },
          datePreset: {
            type: "string",
            enum: [...INSIGHT_ENUMS.datePresets],
            description: "maximum înseamnă tot istoricul contului.",
          },
          daily: {
            type: ["boolean", "null"],
            description: "true împarte rezultatul pe zile.",
          },
          breakdown: {
            type: ["string", "null"],
            enum: [...INSIGHT_ENUMS.breakdowns, null],
            description:
              "Segmentare: vârstă, gen, țară, regiune, platformă sau poziție.",
          },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "list_structure",
      description:
        "Structura contului: campanii, seturi de reclame sau reclame, cu starea lor (activă/oprită), obiectivul și bugetul setat.",
      parameters: {
        type: "object",
        additionalProperties: false,
        required: ["type"],
        properties: {
          type: { type: "string", enum: ["campaigns", "adsets", "ads"] },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_ad_creatives",
      description:
        "Textul efectiv al reclamelor — titlu, mesaj, îndemn. Folosește-l când întrebarea e despre CE scrie într-o reclamă, nu doar cât a costat.",
      parameters: {
        type: "object",
        additionalProperties: false,
        required: [],
        properties: {},
      },
    },
  },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function runTool(name: string, args: any): Promise<unknown> {
  switch (name) {
    case "get_insights":
      return queryInsights({
        level: args?.level,
        datePreset: args?.datePreset,
        breakdown: args?.breakdown ?? undefined,
        daily: args?.daily ?? false,
      });
    case "list_structure":
      return listStructure(args?.type ?? "campaigns");
    case "get_ad_creatives":
      return getAdCreatives();
    default:
      return { error: `Unealtă necunoscută: ${name}` };
  }
}

/**
 * Answers one question, querying Meta as needed.
 *
 * The totals travel in the prompt so an easy question needs no round trip, but
 * anything beyond them is fetched live — which is both fresher than a stored
 * snapshot and honest about where the number came from.
 *
 * Capped at four rounds of tool calls: a question that cannot be answered in
 * four queries is one the assistant should decline rather than grind at.
 */
export async function answerAdsQuestion(
  report: AdsReport,
  question: string,
  history: ChatTurn[] = [],
): Promise<string> {
  if (!isAdsAiConfigured()) {
    throw new Error("OPENAI_API_KEY nu este configurat");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const messages: any[] = [
    { role: "system", content: CHAT_SYSTEM },
    {
      role: "system",
      content:
        `Contul are moneda ${report.currency}. Totalurile pe tot istoricul, ca punct de plecare:\n` +
        JSON.stringify(report.totals) +
        `\n\nPentru orice altceva — pe zile, pe campanii, pe reclame, pe vârste, pe platforme, textul reclamelor — folosește uneltele. Nu ghici niciodată o cifră pe care o poți cere.`,
    },
    ...history.slice(-6),
    { role: "user", content: question },
  ];

  for (let round = 0; round < 5; round++) {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.2,
        messages,
        tools: TOOLS,
      }),
    });

    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(body?.error?.message || `OpenAI ${res.status}`);
    }

    const message = body?.choices?.[0]?.message;
    if (!message) throw new Error("OpenAI a răspuns fără conținut");

    const calls = message.tool_calls ?? [];
    if (calls.length === 0) {
      const content = (message.content ?? "").trim();
      if (!content) throw new Error("OpenAI a răspuns fără conținut");
      return content;
    }

    messages.push(message);

    for (const call of calls) {
      let result: unknown;
      try {
        result = await runTool(
          call.function.name,
          JSON.parse(call.function.arguments || "{}"),
        );
      } catch (error) {
        // Handed back as data: the model should say the query failed rather
        // than answer as though it had succeeded.
        result = { error: (error as Error).message };
      }
      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(result),
      });
    }
  }

  return "Nu am reușit să răspund în numărul de interogări permis. Încearcă o întrebare mai specifică.";
}

export async function analyseAdsReport(report: AdsReport): Promise<AdsAnalysis> {
  if (!isAdsAiConfigured()) {
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
      temperature: 0.4,
      messages: [
        { role: "system", content: SYSTEM },
        {
          role: "user",
          content: `Datele contului, în ${report.currency}:

${JSON.stringify(report, null, 2)}

Scrie:
- headline: o singură propoziție care spune ce e cel mai important lucru din datele astea.
- findings: 3-6 constatări. Fiecare cu titlu scurt, explicație de 2-3 propoziții care arată calculul din spate, și severity.
- actions: 3-5 lucruri concrete de făcut, în ordinea impactului. Fiecare explică și de ce, nu doar ce.
- caveats: 2-3 lucruri pe care datele astea NU le pot spune.`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "ads_analysis", strict: true, schema: SCHEMA },
      },
    }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body?.error?.message || `OpenAI ${res.status}`);
  }

  const content = body?.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenAI a răspuns fără conținut");

  return JSON.parse(content) as AdsAnalysis;
}
