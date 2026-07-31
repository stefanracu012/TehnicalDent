import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { sanitizeObject, validateNoInjection } from "@/lib/security";

export async function GET() {
  try {
    const images = await prisma.galleryImage.findMany({
      orderBy: { order: "asc" },
    });
    return NextResponse.json(images);
  } catch (error) {
    console.error("Error fetching gallery:", error);
    return NextResponse.json(
      { error: "Failed to fetch gallery images" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.json();

    // Security: validate & sanitize input
    if (!validateNoInjection(rawBody)) {
      return NextResponse.json(
        { error: "Input invalid detectat." },
        { status: 400 },
      );
    }
    const body = sanitizeObject(rawBody);

    if (!body.url || !body.alt || !body.category) {
      return NextResponse.json(
        { error: "URL, alt și categoria sunt obligatorii." },
        { status: 400 },
      );
    }

    const image = await prisma.galleryImage.create({
      data: {
        url: body.url,
        alt: body.alt,
        category: body.category,
        order: body.order || 0,
        isActive: body.isActive ?? true,
        translations: body.translations || null,
      },
    });

    revalidatePath("/", "layout");
    return NextResponse.json(image, { status: 201 });
  } catch (error) {
    console.error("Error creating gallery image:", error);
    return NextResponse.json(
      { error: "Failed to create gallery image" },
      { status: 500 },
    );
  }
}
