#!/usr/bin/env node
// Creates (or updates) an admin account with full permissions.
//
//   node scripts/create-admin.mjs <email> <name> <password>
//   npm run create-admin -- <email> <name> <password>
//
// The password is only ever taken as an argument so it is never committed.
// Re-running for an existing email resets that account's password and
// permissions instead of failing, which is also how you recover a lockout.

import { readFileSync } from "node:fs";
import { randomBytes, scrypt } from "node:crypto";
import { promisify } from "node:util";
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
    // Optional — the vars may already be in the environment.
  }
}

const [email, name, password] = process.argv.slice(2);
if (!email || !name || !password) {
  console.error("Usage: node scripts/create-admin.mjs <email> <name> <password>");
  process.exit(1);
}

/**
 * Every "<page>:<action>" pair, read from lib/permissions.ts so this script
 * cannot drift from the app's own list as pages are added.
 */
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
      `Only parsed ${permissions.length} permissions from lib/permissions.ts — refusing to create a half-privileged account.`,
    );
  }
  return permissions;
}

// Same scrypt format lib/password.ts verifies against: "salt:derivedKey", hex.
const scryptAsync = promisify(scrypt);
async function hashPassword(plain) {
  const salt = randomBytes(16).toString("hex");
  const derived = await scryptAsync(plain, salt, 64);
  return `${salt}:${derived.toString("hex")}`;
}

const prisma = new PrismaClient();

try {
  const permissions = allPermissions();
  const passwordHash = await hashPassword(password);
  const normalised = email.toLowerCase().trim();

  const existing = await prisma.adminUser.findUnique({
    where: { email: normalised },
  });

  const user = await prisma.adminUser.upsert({
    where: { email: normalised },
    create: { email: normalised, name, passwordHash, permissions, isActive: true },
    update: { name, passwordHash, permissions, isActive: true },
  });

  console.log(`${existing ? "Updated" : "Created"} admin account`);
  console.log(`  email       : ${user.email}`);
  console.log(`  name        : ${user.name}`);
  console.log(`  permissions : ${permissions.length} (full access)`);
  console.log(`  active      : ${user.isActive}`);
  console.log("\nSign in at /admin/login.");
} catch (error) {
  console.error(`Failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
