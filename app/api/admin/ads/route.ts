import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";
import { fetchAdsReport, isAdsConfigured, type AdsReport } from "@/lib/meta-ads";
import { analyseAdsReport, isAdsAiConfigured } from "@/lib/ads-ai";

/**
 * How many refreshes an hour. Each one costs Meta API quota and an OpenAI call,
 * and the underlying numbers move slowly — nothing useful changes between two
 * refreshes a minute apart.
 */
const REFRESH_LIMIT = 3;
const WINDOW_MS = 60 * 60 * 1000;

/** The stored report, or null when nothing has been pulled yet. */
export async function GET() {
  try {
    const snapshot = await prisma.adsSnapshot.findFirst({
      orderBy: { fetchedAt: "desc" },
    });

    const since = new Date(Date.now() - WINDOW_MS);
    const used = await prisma.adsSnapshot.count({
      where: { fetchedAt: { gte: since } },
    });

    return NextResponse.json({
      snapshot,
      configured: isAdsConfigured(),
      aiConfigured: isAdsAiConfigured(),
      refreshesLeft: Math.max(0, REFRESH_LIMIT - used),
    });
  } catch (error) {
    console.error("Error reading ads snapshot:", error);
    return NextResponse.json(
      { error: "Nu am putut citi raportul salvat." },
      { status: 500 },
    );
  }
}

export async function POST() {
  if (!isAdsConfigured()) {
    return NextResponse.json(
      { error: "Raportul nu este configurat (META_ADS_TOKEN, META_AD_ACCOUNT_ID)." },
      { status: 503 },
    );
  }

  // Counting stored rows rather than a counter in memory: serverless instances
  // come and go, and the limit has to hold across all of them.
  const since = new Date(Date.now() - WINDOW_MS);
  const recent = await prisma.adsSnapshot.findMany({
    where: { fetchedAt: { gte: since } },
    orderBy: { fetchedAt: "asc" },
    select: { fetchedAt: true },
  });

  if (recent.length >= REFRESH_LIMIT) {
    const freeAt = new Date(recent[0].fetchedAt.getTime() + WINDOW_MS);
    const minutes = Math.max(1, Math.ceil((freeAt.getTime() - Date.now()) / 60000));
    return NextResponse.json(
      {
        error: `Ai folosit cele ${REFRESH_LIMIT} reîmprospătări din ultima oră. Mai încearcă în ${minutes} minute.`,
        retryInMinutes: minutes,
      },
      { status: 429 },
    );
  }

  let report: AdsReport;
  try {
    report = await fetchAdsReport();
  } catch (error) {
    console.error("Ads fetch failed:", error);
    return NextResponse.json(
      { error: `Meta: ${(error as Error).message}` },
      { status: 502 },
    );
  }

  // The numbers are the point; losing the commentary is survivable, so a failed
  // analysis still stores the snapshot rather than throwing the pull away.
  let analysis: string | null = null;
  if (isAdsAiConfigured()) {
    try {
      analysis = JSON.stringify(await analyseAdsReport(report));
    } catch (error) {
      console.error("Ads analysis failed:", error);
    }
  }

  const session = await getSession();
  const snapshot = await prisma.adsSnapshot.create({
    data: {
      data: report as unknown as object,
      analysis,
      fetchedBy: session?.email ?? null,
    },
  });

  return NextResponse.json({
    snapshot,
    refreshesLeft: Math.max(0, REFRESH_LIMIT - recent.length - 1),
    analysisFailed: isAdsAiConfigured() && analysis === null,
  });
}
