import { NextResponse } from "next/server";
import { getAllSettings } from "@/lib/data";

// Public read-only endpoint — returns site display settings (no auth needed)
export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await getAllSettings();
  return NextResponse.json(settings);
}
