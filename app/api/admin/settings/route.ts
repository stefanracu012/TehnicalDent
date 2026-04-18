import { NextRequest, NextResponse } from "next/server";
import { getAllSettings, setSetting } from "@/lib/data";

export async function GET() {
  const settings = await getAllSettings();
  return NextResponse.json(settings);
}

export async function POST(req: NextRequest) {
  const { key, value, description } = await req.json();
  if (!key || typeof value !== "string") {
    return NextResponse.json({ error: "Key and value required" }, { status: 400 });
  }
  await setSetting(key, value, description);
  return NextResponse.json({ success: true });
}
