#!/usr/bin/env node
// Turns a token from the Graph API Explorer into the never-expiring Page token
// the app runs on, and reports the ids that go with it.
//
//   node scripts/get-page-token.mjs <token>
//   npm run get-page-token -- <token>
//
// A Page token inherits "never expires" only when it is derived from a
// long-lived User token, so a short-lived Explorer token is exchanged first.
// That exchange needs the app secret, read from WHATSAPP_APP_SECRET (the app
// is shared with the WhatsApp integration).
//
// System User tokens are already permanent and skip the exchange.
//
// The token is passed as an argument and never written to disk.

import { readFileSync } from "node:fs";

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
    // Optional — the vars may already be in the environment.
  }
}

const GRAPH = "https://graph.facebook.com/v21.0";
const APP_SECRET = process.env.WHATSAPP_APP_SECRET || "";

const input = process.argv[2];
if (!input) {
  console.error("Usage: node scripts/get-page-token.mjs <token>");
  process.exit(1);
}

/** Scopes the app needs once everything is wired up. */
const REQUIRED = [
  "pages_messaging",
  "instagram_manage_messages",
  "instagram_basic",
  "pages_read_engagement",
  "pages_manage_posts",
  "instagram_content_publish",
];

async function graph(path, params = {}, token) {
  const url = new URL(`${GRAPH}/${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("access_token", token);
  const res = await fetch(url);
  const body = await res.json();
  if (body.error) throw new Error(body.error.message);
  return body;
}

try {
  // ── What we were handed ───────────────────────────────────────────────────
  const { data: info } = await graph("debug_token", { input_token: input }, input);
  const permanent = !info.expires_at;
  console.log(`Given token   : type ${info.type}${permanent ? ", never expires" : ""}`);

  const missing = REQUIRED.filter((s) => !(info.scopes ?? []).includes(s));
  console.log(
    missing.length
      ? `                ⚠️  missing: ${missing.join(", ")}`
      : "                ✅ all required scopes present",
  );

  // ── Make it long-lived, so the Page token below never expires ─────────────
  // Only a short-lived token needs this. Anything already lasting weeks came
  // from the Access Token Debugger's "Extend Access Token" and is ready to use.
  const daysLeft = info.expires_at
    ? (info.expires_at * 1000 - Date.now()) / 86_400_000
    : Infinity;

  let token = input;
  if (info.type === "USER" && daysLeft < 7) {
    if (!APP_SECRET) {
      throw new Error(
        `this token expires in ${daysLeft.toFixed(1)} days, so the Page token would too.\n` +
          "  Either set WHATSAPP_APP_SECRET, or extend it in the browser:\n" +
          "  developers.facebook.com/tools/debug/accesstoken → paste it →\n" +
          "  'Extend Access Token' → run this script with the extended one.",
      );
    }
    if (!info.app_id) {
      throw new Error("could not read the app id from the token");
    }
    const exchanged = await graph(
      "oauth/access_token",
      {
        grant_type: "fb_exchange_token",
        client_id: info.app_id,
        client_secret: APP_SECRET,
        fb_exchange_token: input,
      },
      input,
    );
    token = exchanged.access_token;
    console.log("Exchanged     : short-lived → long-lived user token ✅");
  }

  // ── The Page token the app actually deploys ───────────────────────────────
  const { data: pages } = await graph("me/accounts", {}, token);
  if (!pages?.length) {
    console.error(
      "\nNo Pages reachable with this token.\n" +
        "Generate it from an account that administers the Page, with\n" +
        "pages_show_list among the scopes.",
    );
    process.exit(1);
  }

  for (const page of pages) {
    console.log(`\nPage          : ${page.name}`);
    console.log(`FACEBOOK_PAGE_ID=${page.id}`);

    let igId = null;
    try {
      const linked = await graph(
        page.id,
        { fields: "instagram_business_account" },
        page.access_token,
      );
      igId = linked?.instagram_business_account?.id ?? null;
    } catch {
      // Reported as absent below.
    }

    if (igId) {
      console.log(`INSTAGRAM_USER_ID=${igId}`);
    } else {
      console.log(
        "INSTAGRAM_USER_ID=   ⚠️  no Instagram Business account linked to this Page",
      );
    }

    console.log(`FACEBOOK_PAGE_ACCESS_TOKEN=${page.access_token}`);
  }

  console.log(
    "\nPut those in Vercel → Settings → Environment Variables, redeploy, then\n" +
      "run `npm run check-meta`. Keep the old token until the Messenger inbox\n" +
      "is verified working on the new one.",
  );
} catch (error) {
  console.error(`Failed: ${error.message}`);
  process.exitCode = 1;
}
