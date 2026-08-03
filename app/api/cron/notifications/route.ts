import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { retryFailed, runRecallScan, runReminderScan } from "@/lib/notifications";
import { sendEveningReminder } from "@/lib/daily-briefing";
import { refreshStaleDigests } from "@/lib/telegram-digest";

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
 * The "Azi"/"Mâine" Telegram topic digests self-refresh whenever a relevant
 * appointment changes; this cron only rebuilds them as a safety net once the
 * calendar day rolls over and nothing else has triggered a refresh yet.
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

  const nowMoldova = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Europe/Chisinau" }),
  );
  const h = nowMoldova.getHours();
  const m = nowMoldova.getMinutes();
  // 20:00–20:10 Moldova → reminder pentru programări nefinalizate
  const inEveningWindow = h === 20 && m >= 0 && m <= 10;
  const todayStr = `${nowMoldova.getFullYear()}-${String(nowMoldova.getMonth() + 1).padStart(2, "0")}-${String(nowMoldova.getDate()).padStart(2, "0")}`;

  try {
    const [reminders, recalls, retried] = await Promise.all([
      runReminderScan(),
      runRecallScan(),
      retryFailed(),
    ]);

    await refreshStaleDigests();

    let evening: { sent?: number; skipped?: boolean } = { skipped: true };
    if (inEveningWindow && (await claimDailyRun("evening-reminder", todayStr))) {
      evening = await sendEveningReminder();
    }

    return NextResponse.json({ ok: true, reminders, recalls, retried, evening });
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
