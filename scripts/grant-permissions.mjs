#!/usr/bin/env node
// Grants an account every permission the app currently defines, without
// touching its password.
//
//   node scripts/grant-permissions.mjs <email>
//   npm run grant-permissions -- <email>
//   npm run grant-permissions            (lists who is missing what)
//
// Permissions are stored per account as an explicit list, so an account created
// before a page existed cannot open that page. The owner is unaffected — it
// holds "*" rather than a copy of the list, which is the whole point of that
// design. Everyone else needs the new keys added, and this adds them.

import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

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
    // Optional.
  }
}

/** Read from lib/permissions.ts so this can never drift from the app's list. */
function allPermissions() {
  const src = readFileSync("lib/permissions.ts", "utf8");
  const list = src.slice(src.indexOf("export const PERMISSIONS"));
  const permissions = [];
  const entry = /key:\s*"([^"]+)"[\s\S]*?actions:\s*\[([^\]]*)\]/g;
  let match;
  while ((match = entry.exec(list)) !== null) {
    const [, key, actions] = match;
    for (const action of actions.match(/"([^"]+)"/g) ?? []) {
      permissions.push(`${key}:${action.replace(/"/g, "")}`);
    }
  }
  if (permissions.length < 20) {
    throw new Error(
      `Only parsed ${permissions.length} permissions — refusing to write a truncated list.`,
    );
  }
  return permissions;
}

const email = process.argv[2]?.toLowerCase().trim();
const prisma = new PrismaClient();

try {
  const all = allPermissions();
  const owner = process.env.ADMIN_EMAIL?.toLowerCase().trim();

  if (!email) {
    // No argument: report only, change nothing.
    const users = await prisma.adminUser.findMany({
      select: { email: true, permissions: true },
    });
    console.log(`Aplicația definește ${all.length} permisiuni.\n`);
    for (const u of users) {
      if (u.permissions.includes("*")) {
        console.log(`  ${u.email.padEnd(32)} proprietar (*) — are tot`);
        continue;
      }
      const missing = all.filter((p) => !u.permissions.includes(p));
      console.log(
        `  ${u.email.padEnd(32)} ${u.permissions.length} permisiuni` +
          (missing.length ? `  ❌ lipsesc ${missing.length}: ${missing.join(", ")}` : "  ✅ complet"),
      );
    }
    console.log(
      "\nCa să completezi un cont:  npm run grant-permissions -- <email>",
    );
  } else {
    const user = await prisma.adminUser.findUnique({ where: { email } });
    if (!user) {
      console.error(`Nu există niciun cont cu emailul ${email}`);
      process.exitCode = 1;
    } else if (user.permissions.includes("*")) {
      console.log(`${email} este proprietarul și are deja acces complet.`);
    } else {
      const before = [...user.permissions];
      const missing = all.filter((p) => !before.includes(p));

      await prisma.adminUser.update({
        where: { email },
        data: { permissions: all },
      });

      // Counts rather than a verdict: a wrong "nothing was missing" next to a
      // list that just grew by two is worse than no message at all.
      console.log(`${email} — parola neatinsă`);
      console.log(`  înainte: ${before.length} permisiuni`);
      console.log(`  acum   : ${all.length} permisiuni`);
      if (missing.length) {
        console.log(`  adăugate: ${missing.join(", ")}`);
      }
    }
    if (owner === email) {
      console.log("  (acesta e și ADMIN_EMAIL)");
    }
  }
} catch (error) {
  console.error(`Failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
