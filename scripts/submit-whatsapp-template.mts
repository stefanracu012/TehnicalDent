// =============================================
// Submits a WhatsApp message template to Meta for review, and lists the ones
// already there.
//
//   npm run submit-template -- --list
//   npm run submit-template -- --waba <WABA_ID>
//
// The WhatsApp Business Account id is not derivable from the phone-number
// token, so it is passed in or set as WHATSAPP_WABA_ID. It sits in Meta
// Business Suite under WhatsApp Manager -> API Setup, labelled "WhatsApp
// Business Account ID".
//
// Nothing here sends a message to anyone. Submitting only asks Meta to review
// the wording; approval usually takes minutes to a few hours, and the template
// cannot be used until it comes back APPROVED.
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
const WABA = argOf("--waba") ?? process.env.WHATSAPP_WABA_ID ?? "";
const GRAPH = "https://graph.facebook.com/v21.0";

if (!TOKEN) {
  console.error("Lipsește WHATSAPP_TOKEN (sau --token).");
  process.exit(1);
}
if (!WABA) {
  console.error(
    [
      "Lipsește ID-ul contului WhatsApp Business.",
      "",
      "Îl găsiți în Meta Business Suite -> WhatsApp Manager -> API Setup,",
      'la "WhatsApp Business Account ID". Apoi:',
      "",
      "  npm run submit-template -- --waba 1234567890",
      "",
      "sau puneți-l ca WHATSAPP_WABA_ID în .env.local și pe Vercel.",
    ].join(NL),
  );
  process.exit(1);
}

async function graph(path: string, init?: RequestInit) {
  const url = `${GRAPH}/${path}${path.includes("?") ? "&" : "?"}access_token=${TOKEN}`;
  const res = await fetch(url, init);
  return { ok: res.ok, status: res.status, body: await res.json() };
}

async function list() {
  const res = await graph(`${WABA}/message_templates?fields=name,status,category,language&limit=50`);
  if (!res.ok) {
    console.error(`Nu am putut citi șabloanele (${res.status}):`);
    console.error(JSON.stringify(res.body, null, 2).slice(0, 800));
    process.exit(1);
  }
  const rows = (res.body.data ?? []) as {
    name: string;
    status: string;
    category: string;
    language: string;
  }[];
  console.log(`Șabloane pe acest cont: ${rows.length}`);
  for (const r of rows) {
    console.log(`   ${r.status.padEnd(10)} ${r.name} (${r.language}, ${r.category})`);
  }
  return rows;
}

async function submit() {
  const existing = await list();
  const already = existing.find(
    (r) => r.name === SEASONAL_OFFER_TEMPLATE.name && r.language === SEASONAL_OFFER_TEMPLATE.language,
  );
  if (already) {
    console.log("");
    console.log(
      `Șablonul "${SEASONAL_OFFER_TEMPLATE.name}" există deja, status ${already.status}.`,
    );
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
} else {
  await submit();
}
