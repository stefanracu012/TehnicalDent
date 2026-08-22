import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { retryFailed, runRecallScan, runReminderScan } from "@/lib/notifications";
import { sendEveningReminder } from "@/lib/daily-briefing";
import { sendDoctorMorningBriefings } from "@/lib/doctor-notify";
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

const LOCK_KEY = "cron-dispatch-lock";
const LOCK_TTL = 45_000;

/**
 * Stops two dispatcher runs from overlapping. Without this, a second run
 * starting while the first is mid-scan sees the same not-yet-reminded
 * appointments and sends everything twice — which is exactly what happened
 * when a manual poll landed on top of the scheduled run.
 *
 * Held as a timestamp string in CronState (never null, so no absent-field
 * ambiguity). The claim is a compare-and-swap: concurrent runs read the same
 * previous value but only one updateMany matches it, so only one proceeds.
 * The TTL releases the lock if a run dies without finishing.
 */
async function acquireDispatchLock(): Promise<boolean> {
  const now = Date.now();
  const existing = await prisma.cronState.findUnique({ where: { key: LOCK_KEY } });

  if (!existing) {
    try {
      await prisma.cronState.create({ data: { key: LOCK_KEY, lastRunDate: String(now) } });
      return true;
    } catch {
      return false; // lost the create race against a concurrent run
    }
  }

  if (now - (Number(existing.lastRunDate) || 0) < LOCK_TTL) return false;

  const claimed = await prisma.cronState.updateMany({
    where: { key: LOCK_KEY, lastRunDate: existing.lastRunDate },
    data: { lastRunDate: String(now) },
  });
  return claimed.count === 1;
}

async function releaseDispatchLock(): Promise<void> {
  await prisma.cronState
    .update({ where: { key: LOCK_KEY }, data: { lastRunDate: "0" } })
    .catch(() => {});
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

  // A run can name the job it is for: /api/cron/notifications?job=morning.
  //
  // The clock windows below only work if something calls this every hour, and
  // on a plan that allows one run a day it never lands inside them — which is
  // exactly how the 20:00 reminder went a whole year without firing. Naming
  // the job makes a once-a-day schedule enough, and the daily claim still
  // stops a job running twice.
  const job = url.searchParams.get("job");

  // 20:00–20:10 Moldova → reminder pentru programări nefinalizate
  const inEveningWindow = job === "evening" || (!job && h === 20 && m >= 0 && m <= 10);
  // 08:00–08:10 Moldova → fiecare medic își primește pacienții zilei
  const inMorningWindow = job === "morning" || (!job && h === 8 && m >= 0 && m <= 10);
  const todayStr = `${nowMoldova.getFullYear()}-${String(nowMoldova.getMonth() + 1).padStart(2, "0")}-${String(nowMoldova.getDate()).padStart(2, "0")}`;

  if (!(await acquireDispatchLock())) {
    return NextResponse.json({ ok: true, skipped: "another run in progress" });
  }

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

    let morning: { doctors?: number; sent?: number; skipped?: boolean } = { skipped: true };
    if (inMorningWindow && (await claimDailyRun("doctor-morning", todayStr))) {
      morning = await sendDoctorMorningBriefings();
    }

    return NextResponse.json({ ok: true, reminders, recalls, retried, evening, morning });
  } catch (error) {
    console.error("Cron error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed" },
      { status: 500 },
    );
  } finally {
    await releaseDispatchLock();
  }
}

export const POST = handle;
export const GET = handle;
