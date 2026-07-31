#!/usr/bin/env node
// Run after deploy: node scripts/set-webhook.mjs
// Or: npm run set-webhook

import "dotenv/config";

const token = process.env.TELEGRAM_BOT_TOKEN;
const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

if (!token || !secret || !siteUrl) {
  console.error("Missing TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET or NEXT_PUBLIC_SITE_URL");
  process.exit(1);
}

const webhookUrl = `${siteUrl}/api/telegram/webhook/${secret}`;

const res = await fetch(
  `https://api.telegram.org/bot${token}/setWebhook?url=${encodeURIComponent(webhookUrl)}&allowed_updates=message`
);
const data = await res.json();

if (data.ok) {
  console.log("✅ Webhook set:", webhookUrl);
} else {
  console.error("❌ Failed:", data);
  process.exit(1);
}
