// =============================================
// WhatsApp message templates: list them, submit the seasonal offer, and
// correct the clinic's name where Meta has it misspelled.
//
//   npm run submit-template -- --list        arată toate șabloanele
//   npm run submit-template -- --check-name  arată unde e scris greșit
//   npm run submit-template -- --fix-name    corectează (retrimite la Meta)
//   npm run submit-template                  trimite promoția sezonieră
//
// The WhatsApp Business Account id is not derivable from the phone-number
// token. It arrives on every webhook Meta sends, though, and the WhatsApp
// webhook records it — so this reads it from the database, and only asks for
// --waba when no WhatsApp event has been received yet.
//
// Submitting or editing does not message anyone. It asks Meta to review the
// wording; an edited template keeps working in its approved form until the new
// one is approved.
// =============================================

import fs from "node:fs";

// Dynamic, because a static import of a .ts module from a .mts script is not
// resolved by the loader here.
const { SEASONAL_OFFER_TEMPLATE } = await import("../lib/whatsapp-templates.js");

const NL = String.fromCharCode(10);

function loadEnv(file: string) {
  if (!fs.existsSync(file)) return;
  for (const raw of fs.readFileSync(file, "utf8").split(NL)) {
    const line = raw.trim();
    const i = line.indexOf("=");
    if (i > 0 && !line.startsWith("#")) {
      let v = line.slice(i + 1).trim();
      const q = v.slice(0, 1);
      if ((q === '"' || q === "'") && v.endsWith(q)) v = v.slice(1, -1);
      if (!process.env[line.slice(0, i)]) process.env[line.slice(0, i)] = v;
    }
  }
}
loadEnv(".env.local");

const args = process.argv.slice(2);
const argOf = (flag: string) => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : undefined;
};

const TOKEN = argOf("--token") ?? process.env.WHATSAPP_TOKEN ?? "";
const GRAPH = "https://graph.facebook.com/v21.0";

if (!TOKEN) {
  console.error("Lipsește WHATSAPP_TOKEN (sau --token).");
  process.exit(1);
}

/** Command line, then environment, then whatever the webhook recorded. */
async function resolveWaba(): Promise<string> {
  const given = argOf("--waba") ?? process.env.WHATSAPP_WABA_ID;
  if (given) return given;

  try {
    const { default: prisma } = await import("../lib/prisma.js");
    const row = await prisma.siteSettings.findUnique({
      where: { key: "whatsapp_waba_id" },
    });
    if (row?.value) {
      console.log(`ID-ul contului WhatsApp Business: ${row.value} (din webhook)`);
      console.log("");
      return row.value;
    }
  } catch {
    // No database reachable from here — fall through to the instructions.
  }

  console.error(
    [
      "Nu am ID-ul contului WhatsApp Business.",
      "",
      "Se salvează singur la primul eveniment WhatsApp primit după deploy:",
      "trimiteți un mesaj pe numărul clinicii și rulați din nou comanda.",
      "",
      "Sau îl luați din Meta Business Suite -> WhatsApp Manager -> API Setup",
      'la "WhatsApp Business Account ID" și rulați:',
      "",
      "  npm run submit-template -- --waba 1234567890",
    ].join(NL),
  );
  process.exit(1);
}

const WABA = await resolveWaba();

async function graph(path: string, init?: RequestInit) {
  const url = `${GRAPH}/${path}${path.includes("?") ? "&" : "?"}access_token=${TOKEN}`;
  const res = await fetch(url, init);
  return { ok: res.ok, status: res.status, body: await res.json() };
}

interface TemplateComponent {
  type: string;
  text?: string;
  format?: string;
  buttons?: unknown[];
  example?: unknown;
}
interface Template {
  id: string;
  name: string;
  status: string;
  category: string;
  language: string;
  components?: TemplateComponent[];
}

async function fetchTemplates(): Promise<Template[]> {
  const res = await graph(
    `${WABA}/message_templates?fields=id,name,status,category,language,components&limit=100`,
  );
  if (!res.ok) {
    console.error(`Nu am putut citi șabloanele (${res.status}):`);
    console.error(JSON.stringify(res.body, null, 2).slice(0, 800));
    process.exit(1);
  }
  return (res.body.data ?? []) as Template[];
}

async function list() {
  const rows = await fetchTemplates();
  console.log(`Șabloane pe acest cont: ${rows.length}`);
  for (const r of rows) {
    console.log(`   ${r.status.padEnd(10)} ${r.name} (${r.language}, ${r.category})`);
  }
  return rows;
}

/** Every spelling of the clinic that is not the right one. */
const WRONG_NAMES = ["TechnicalDent", "Technical Dent", "TECHNICAL DENT", "TechnicalDENT"];
const RIGHT_NAME = "Tehnical Dent";

function correct(text: string): string {
  let out = text;
  for (const wrong of WRONG_NAMES) out = out.split(wrong).join(RIGHT_NAME);
  return out;
}

async function checkName({ apply }: { apply: boolean }) {
  const rows = await fetchTemplates();
  const affected = rows.filter((t) =>
    (t.components ?? []).some((c) => c.text && correct(c.text) !== c.text),
  );

  if (affected.length === 0) {
    console.log(`Numele clinicii e scris corect în toate cele ${rows.length} șabloane.`);
    return;
  }

  console.log(`Șabloane cu numele scris greșit: ${affected.length}`);
  for (const t of affected) {
    console.log("");
    console.log(`   ${t.name} (${t.language}, ${t.status})`);
    for (const c of t.components ?? []) {
      if (c.text && correct(c.text) !== c.text) {
        console.log(`      ${c.type}: ${c.text.slice(0, 100)}`);
        console.log(`      devine: ${correct(c.text).slice(0, 100)}`);
      }
    }
  }

  if (!apply) {
    console.log("");
    console.log("Ca să le corectez:  npm run submit-template -- --fix-name");
    console.log("Fiecare corectură retrimite șablonul la Meta pentru aprobare.");
    console.log("Varianta aprobată rămâne activă până când e aprobată cea nouă.");
    return;
  }

  for (const t of affected) {
    const components = (t.components ?? []).map((c) =>
      c.text ? { ...c, text: correct(c.text) } : c,
    );
    const res = await graph(t.id, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ components }),
    });
    if (res.ok) {
      console.log(`   ✅ ${t.name} — trimis spre aprobare`);
    } else {
      console.log(`   ❌ ${t.name} — ${JSON.stringify(res.body).slice(0, 200)}`);
    }
  }
}

async function submit() {
  const existing = await list();
  const already = existing.find(
    (r) =>
      r.name === SEASONAL_OFFER_TEMPLATE.name &&
      r.language === SEASONAL_OFFER_TEMPLATE.language,
  );
  if (already) {
    console.log("");
    console.log(`Șablonul "${SEASONAL_OFFER_TEMPLATE.name}" există deja, status ${already.status}.`);
    console.log("Meta nu acceptă două șabloane cu același nume și aceeași limbă.");
    console.log("Ca să schimbați textul, editați-l din WhatsApp Manager sau ștergeți-l acolo întâi.");
    return;
  }

  console.log("");
  console.log("Trimit spre aprobare:");
  console.log("");
  console.log(SEASONAL_OFFER_TEMPLATE.body);
  console.log("");

  const res = await graph(`${WABA}/message_templates`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: SEASONAL_OFFER_TEMPLATE.name,
      language: SEASONAL_OFFER_TEMPLATE.language,
      category: SEASONAL_OFFER_TEMPLATE.category,
      components: [
        {
          type: "BODY",
          text: SEASONAL_OFFER_TEMPLATE.body,
          example: { body_text: [[...SEASONAL_OFFER_TEMPLATE.example]] },
        },
        { type: "FOOTER", text: SEASONAL_OFFER_TEMPLATE.footer },
      ],
    }),
  });

  if (!res.ok) {
    console.error(`❌ Meta a refuzat trimiterea (${res.status}):`);
    console.error(JSON.stringify(res.body, null, 2).slice(0, 1200));
    process.exit(1);
  }

  console.log("✅ Trimis spre aprobare.");
  console.log(`   id: ${res.body.id}   status: ${res.body.status ?? "PENDING"}`);
  console.log("");
  console.log("Verificați mai târziu cu:  npm run submit-template -- --list");
  console.log("Până când apare APPROVED, promoția sezonieră nu se poate trimite.");
}

if (args.includes("--list")) {
  await list();
} else if (args.includes("--check-name")) {
  await checkName({ apply: false });
} else if (args.includes("--fix-name")) {
  await checkName({ apply: true });
} else {
  await submit();
}

process.exit(0);
