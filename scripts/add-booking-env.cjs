// One-shot helper to append booking module env vars to .env.
// Safe to re-run: it's a no-op if the keys already exist.
const fs = require("fs");
const c = require("crypto");

const apptSecret = c.randomBytes(32).toString("hex");
const cronSecret = c.randomBytes(32).toString("hex");

let env = fs.readFileSync(".env", "utf8");

const additions = [
  "",
  "# ============================================",
  "# Booking module (Programari) - added automatically",
  "# ============================================",
  "",
  "# Viber Business Account (for client confirmations / reminders)",
  "# 1. Create a Viber Bot/Public Account at https://partners.viber.com/account/create-bot-account",
  "# 2. After approval, copy the auth token from your bot dashboard.",
  "# 3. Leave empty to disable Viber (Telegram still works).",
  'VIBER_BOT_TOKEN=""',
  'VIBER_SENDER_NAME="TechnicalDent"',
  "",
  "# Secret used to sign public confirm/cancel links (HMAC). Auto-generated.",
  `APPOINTMENT_TOKEN_SECRET="${apptSecret}"`,
  "",
  "# Secret required by the cron endpoint (/api/cron/notifications).",
  "# Pass as header  x-cron-secret: <value>  or query  ?secret=<value>",
  `CRON_SECRET="${cronSecret}"`,
  "",
  "# Public site URL - used to build confirm/cancel links sent to patients.",
  'NEXT_PUBLIC_SITE_URL="https://tehnicaldent.md"',
  "",
].join("\r\n");

if (!env.includes("APPOINTMENT_TOKEN_SECRET")) {
  fs.writeFileSync(".env", env.trimEnd() + "\r\n" + additions, "utf8");
  console.log("OK - added booking env vars");
  console.log("APPOINTMENT_TOKEN_SECRET=" + apptSecret);
  console.log("CRON_SECRET=" + cronSecret);
} else {
  console.log("Already present - no changes");
}
