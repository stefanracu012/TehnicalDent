// TEMPORARY read-only diagnostic — mirrors runReminderScan()'s exact query
// windows without sending anything. Delete after the missing-reminder bug
// is found. Protected by the same CRON_SECRET.

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const expected = process.env.CRON_SECRET || "";
  if (!expected || url.searchParams.get("secret") !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = Date.now();
  const HOUR = 60 * 60_000;

  const window24 = {
    gte: new Date(now + 23 * HOUR),
    lte: new Date(now + 25 * HOUR),
  };

  const matching24 = await prisma.appointment.findMany({
    where: {
      status: { in: ["pending", "confirmed"] },
      dateTime: window24,
      OR: [{ remindedAt: null }, { remindedAt: { lt: new Date(now - 22 * HOUR) } }],
    },
    select: { id: true, dateTime: true, status: true, remindedAt: true },
  });

  // Same window WITHOUT the remindedAt filter, to see if that's what excludes it
  const inWindowAnyReminded = await prisma.appointment.findMany({
    where: { status: { in: ["pending", "confirmed"] }, dateTime: window24 },
    select: { id: true, dateTime: true, status: true, remindedAt: true },
  });

  // All upcoming appointments in the next 48h regardless of anything
  const upcoming = await prisma.appointment.findMany({
    where: { dateTime: { gte: new Date(now), lte: new Date(now + 48 * HOUR) } },
    orderBy: { dateTime: "asc" },
    select: { id: true, dateTime: true, status: true, remindedAt: true },
  });

  return NextResponse.json({
    nowUTC: new Date(now).toISOString(),
    window24From: window24.gte.toISOString(),
    window24To: window24.lte.toISOString(),
    matching24,
    inWindowAnyReminded,
    upcoming,
  });
}
