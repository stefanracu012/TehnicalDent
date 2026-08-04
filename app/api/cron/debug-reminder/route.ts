// TEMPORARY read-only diagnostic — inspects reminder eligibility and the
// delivery log for recent notifications. Delete once the missing-reminder
// issue is fully resolved. Protected by CRON_SECRET.

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

  const upcoming = await prisma.appointment.findMany({
    where: { dateTime: { gte: new Date(now), lte: new Date(now + 48 * HOUR) } },
    orderBy: { dateTime: "asc" },
    select: { id: true, dateTime: true, status: true, remindedAt: true },
  });

  // Every delivery attempt from the last 6 hours, with its failure reason.
  const notifications = await prisma.notification.findMany({
    where: { createdAt: { gte: new Date(now - 6 * HOUR) } },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: {
      type: true,
      channel: true,
      status: true,
      recipient: true,
      error: true,
      attempts: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ nowUTC: new Date(now).toISOString(), upcoming, notifications });
}
