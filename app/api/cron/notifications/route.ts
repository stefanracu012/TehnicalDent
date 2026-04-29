import { NextResponse } from "next/server";
import { retryFailed, runRecallScan, runReminderScan } from "@/lib/notifications";

/**
 * Cron-driven notifications dispatcher.
 *
 * Protected by CRON_SECRET (header `x-cron-secret` or query `?secret=...`).
 * Should be invoked every ~10 minutes by an external scheduler
 * (Vercel Cron, GitHub Actions, cron-job.org, etc.).
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

  try {
    const [reminders, recalls, retried] = await Promise.all([
      runReminderScan(),
      runRecallScan(),
      retryFailed(),
    ]);
    return NextResponse.json({ ok: true, reminders, recalls, retried });
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
