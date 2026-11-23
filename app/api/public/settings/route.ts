import { NextResponse } from "next/server";
import { getAllSettings } from "@/lib/data";

// Public read-only endpoint — returns site display settings (no auth needed)
export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await getAllSettings();
  // Held by the CDN for five minutes: the settings change a few times a year,
  // and each uncached read was a server function and a database query.
  return NextResponse.json(settings, {
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600" },
  });
}
