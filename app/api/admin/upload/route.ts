import { NextResponse } from "next/server";
import { put } from "@vercel/blob";

export async function POST(request: Request) {
  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.error("BLOB_READ_WRITE_TOKEN is not configured");
      return NextResponse.json(
        { error: "Stocarea imaginilor nu este configurată pe server. Adăugați BLOB_READ_WRITE_TOKEN în variabilele de mediu." },
        { status: 500 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as string) || "uploads";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/avif",
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Only JPEG, PNG, WebP, and AVIF images are allowed" },
        { status: 400 },
      );
    }

    // Max 10MB
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File size must be less than 10MB" },
        { status: 400 },
      );
    }

    // Generate unique filename
    const ext = file.name.split(".").pop() || "jpg";
    const safeName = file.name
      .replace(`.${ext}`, "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .substring(0, 40);
    const uniqueName = `${folder}/${safeName}-${Date.now()}.${ext}`;

    // Upload to Vercel Blob
    const blob = await put(uniqueName, file, {
      access: "public",
      addRandomSuffix: false,
    });

    return NextResponse.json(
      { url: blob.url, filename: uniqueName },
      { status: 201 },
    );
  } catch (error) {
    console.error("Upload error:", error);
    const message = error instanceof Error ? error.message : "Eroare necunoscută";
    return NextResponse.json(
      { error: `Eroare la încărcarea fișierului: ${message}` },
      { status: 500 },
    );
  }
}
