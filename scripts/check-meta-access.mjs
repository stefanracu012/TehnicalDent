#!/usr/bin/env node
// Reports what the existing Facebook Page token can actually do.
// Read-only — it never posts or changes anything.
//
//   node scripts/check-meta-access.mjs
//   npm run check-meta
//
// Answers the three questions we cannot answer from the codebase alone:
//   1. which permissions the permanent token was minted with,
//   2. the Page ID and linked Instagram account ID (neither is in .env yet),
//   3. whether auto-publishing would work today or needs the token re-issued.

import { readFileSync } from "node:fs";

// The repo keeps secrets in .env.local; dotenv only reads .env by default.
for (const file of [".env.local", ".env"]) {
  try {
    for (const line of readFileSync(file, "utf8").split("\n")) {
      const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (!m) continue;
      const [, key, raw = ""] = m;
      if (process.env[key] === undefined) {
        process.env[key] = raw.trim().replace(/^(['"])([\s\S]*)\1$/, "$2");
      }
    }
  } catch {
    // File is optional — the vars may already be in the environment.
  }
}

const GRAPH = "https://graph.facebook.com/v21.0";
const TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN || "";

if (!TOKEN) {
  console.error("❌ FACEBOOK_PAGE_ACCESS_TOKEN is not set (.env.local)");
  process.exit(1);
}

/**
 * Scopes each feature needs. Messenger is listed so a re-issued token does not
 * silently drop it.
 *
 * A scope shown here as present only means the token carries it. It says
 * nothing about whether the app holds Standard or Advanced Access for it —
 * both look identical on the token, and only the App Dashboard
 * (App Review → Permissions and Features) distinguishes them.
 */
const NEEDED = {
  "Messenger + Instagram DM": ["pages_messaging", "instagram_manage_messages"],
  "Publish to the Facebook Page": ["pages_manage_posts"],
  "Publish to Instagram": ["instagram_content_publish", "instagram_basic"],
};

async function graph(path, params = {}) {
  const url = new URL(`${GRAPH}/${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("access_token", TOKEN);
  const res = await fetch(url);
  const body = await res.json();
  if (body.error) throw new Error(`${body.error.type}: ${body.error.message}`);
  return body;
}

console.log("Asking Meta what this token can do…\n");

// Every check below is independent: a token scoped only for messaging fails
// most of them, and each failure is itself a useful answer.
const short = (err) => String(err.message).split(". ")[0];

// ── Identity ────────────────────────────────────────────────────────────────
let pageId = null;
try {
  const me = await graph("me", { fields: "id,name" });
  pageId = me.id;
  console.log(`Page          : ${me.name}  (id ${me.id})`);
} catch (err) {
  console.log(`Page          : ⚠️  cannot read — ${short(err)}`);
  console.log("                (token lacks pages_read_engagement)");
}

// ── Linked Instagram account ────────────────────────────────────────────────
let igId = null;
if (pageId) {
  try {
    const linked = await graph(pageId, { fields: "instagram_business_account" });
    igId = linked.instagram_business_account?.id ?? null;
    console.log(
      igId
        ? `Instagram     : linked  (id ${igId})`
        : "Instagram     : ⚠️  no Business/Creator account linked to this Page",
    );
  } catch (err) {
    console.log(`Instagram     : cannot resolve — ${short(err)}`);
  }
} else {
  console.log("Instagram     : skipped (need the Page id first)");
}

// ── Token type, expiry and scopes ───────────────────────────────────────────
let scopes = null;
try {
  const { data } = await graph("debug_token", { input_token: TOKEN });
  const expires =
    data.expires_at === 0 || data.expires_at === undefined
      ? "never ✅"
      : new Date(data.expires_at * 1000).toISOString().slice(0, 10);
  // lib/messenger.ts posts to /me/messages, where "me" only resolves to the
  // Page on a PAGE token. A USER token carries the same scopes and looks fine
  // everywhere else, so this is worth calling out loudly.
  const wrongType = data.type !== "PAGE";
  console.log(
    `Token type    : ${data.type}${wrongType ? "  ❌ must be PAGE" : "  ✅"}`,
  );
  if (wrongType) {
    console.log(
      "                Replies will fail with \"Object with ID 'me' does not\n" +
        '                exist". Derive the Page token from this one:\n' +
        "                  npm run get-page-token -- <this-token>",
    );
  }
  console.log(`Expires       : ${expires}`);
  scopes = data.scopes ?? null;
} catch (err) {
  console.log(`Token details : unavailable — ${err.message}`);
  console.log("                (needs an app or admin token; not fatal)");
}

// ── What works, what does not ───────────────────────────────────────────────
console.log("\nPermissions");
if (!scopes) {
  console.log("  Scopes could not be read, so the checks below are skipped.");
  console.log("  Read them manually at developers.facebook.com → Tools → Access Token Debugger.");
} else {
  for (const [feature, required] of Object.entries(NEEDED)) {
    const missing = required.filter((s) => !scopes.includes(s));
    console.log(
      missing.length === 0
        ? `  ✅ ${feature}`
        : `  ❌ ${feature} — missing: ${missing.join(", ")}`,
    );
  }
}

// ── Env lines to add ────────────────────────────────────────────────────────
const additions = [];
if (pageId && !process.env.FACEBOOK_PAGE_ID) {
  additions.push(`FACEBOOK_PAGE_ID=${pageId}`);
}
if (igId && !process.env.INSTAGRAM_USER_ID) {
  additions.push(`INSTAGRAM_USER_ID=${igId}`);
}
if (additions.length) {
  console.log("\nAdd to .env.local:");
  for (const line of additions) console.log(`  ${line}`);
}

console.log(
  "\nIf a scope is missing, re-issue the token with the union of every scope\n" +
    "listed above — dropping the Messenger ones would take the inbox down.\n" +
    "\nThis reports token scopes only. To see whether each permission sits on\n" +
    "Standard or Advanced Access, open the App Dashboard →\n" +
    "App Review → Permissions and Features.",
);
