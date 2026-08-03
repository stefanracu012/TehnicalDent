import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { retryFailed, runRecallScan, runReminderScan } from "@/lib/notifications";
import { sendDailyBriefing, sendEveningReminder } from "@/lib/daily-briefing";

// Marks `key` as run for `todayStr` ("YYYY-MM-DD") — returns true only the
// first time it's called for a given day, so repeated cron invocations
// inside the same time window don't resend the daily briefing/reminder.
async function claimDailyRun(key: string, todayStr: string): Promise<boolean> {
  const existing = await prisma.cronState.findUnique({ where: { key } });
  if (existing?.lastRunDate === todayStr) return false;
  await prisma.cronState.upsert({
    where: { key },
    create: { key, lastRunDate: todayStr },
    update: { lastRunDate: todayStr },
  });
  return true;
}

/**
 * Cron-driven notifications dispatcher.
 *
 * Protected by CRON_SECRET (header `x-cron-secret` or query `?secret=...`).
 * Should be invoked every ~10 minutes by an external scheduler
 * (Vercel Cron, GitHub Actions, cron-job.org, etc.).
 *
 * Daily briefing (Telegram) fires automatically when this cron runs
 * between 07:25–07:35 Moldova time (once per day).
 */
async function handle(request: Request) {
  const url = new URL(request.url);
  const expected = process.env.CRON_SECRET || "";

  if (!expected) {
    return NextResponse.json({ error: "CRON_SECRET not set" }, { status: 500 });
  }

  // Vercel Cron sends: Authorization: Bearer <CRON_SECRET>
  const authHeader = request.headers.get("authorization") || "";
  const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  // Also accept x-cron-secret header or ?secret= query (manual / external cron)
  const secretHeader = request.headers.get("x-cron-secret") || "";
  const secretQuery = url.searchParams.get("secret") || "";

  const valid = bearerToken === expected || secretHeader === expected || secretQuery === expected;

  if (!valid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if we're in the 07:25–07:35 Moldova window → send daily briefing
  const nowMoldova = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Europe/Chisinau" }),
  );
  const h = nowMoldova.getHours();
  const m = nowMoldova.getMinutes();
  const inBriefingWindow = h === 7 && m >= 25 && m <= 35;
  // 20:00–20:10 Moldova → reminder pentru programări nefinalizate
  const inEveningWindow = h === 20 && m >= 0 && m <= 10;
  const todayStr = `${nowMoldova.getFullYear()}-${String(nowMoldova.getMonth() + 1).padStart(2, "0")}-${String(nowMoldova.getDate()).padStart(2, "0")}`;

  try {
    const [reminders, recalls, retried] = await Promise.all([
      runReminderScan(),
      runRecallScan(),
      retryFailed(),
    ]);

    let briefing: { sent?: number; skipped?: boolean } = { skipped: true };
    if (inBriefingWindow && (await claimDailyRun("daily-briefing", todayStr))) {
      briefing = await sendDailyBriefing();
    }

    let evening: { sent?: number; skipped?: boolean } = { skipped: true };
    if (inEveningWindow && (await claimDailyRun("evening-reminder", todayStr))) {
      evening = await sendEveningReminder();
    }

    return NextResponse.json({ ok: true, reminders, recalls, retried, briefing, evening });
  } catch (error) {
    console.error("Cron error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed" },
      { status: 500 },
    );
  }
}

export const POST = handle;
export const GET = handle;
