import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
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
  // Invalidate all locale homepages and about pages so changes appear immediately
  revalidatePath("/", "layout");
  return NextResponse.json({ success: true });
}
