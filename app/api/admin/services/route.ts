import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { sanitizeObject, validateNoInjection } from "@/lib/security";

export async function GET() {
  try {
    const services = await prisma.service.findMany({
      orderBy: { order: "asc" },
    });
    return NextResponse.json(services);
  } catch (error) {
    console.error("Error fetching services:", error);
    return NextResponse.json(
      { error: "Failed to fetch services" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.json();

    if (!validateNoInjection(rawBody)) {
      return NextResponse.json(
        { error: "Input invalid detectat." },
        { status: 400 },
      );
    }

    const body = sanitizeObject(rawBody, ["description", "overview", "process", "recovery"]);

    // Validate required fields
    const requiredFields = [
      "title",
      "slug",
      "shortDesc",
      "description",
      "overview",
      "process",
      "recovery",
      "category",
    ];

    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Câmpul ${field} este obligatoriu.` },
          { status: 400 }
        );
      }
    }

    // Check if slug is unique
    const existingService = await prisma.service.findUnique({
      where: { slug: body.slug },
    });

    if (existingService) {
      return NextResponse.json(
        { error: "Există deja un serviciu cu acest slug." },
        { status: 400 }
      );
    }

    const service = await prisma.service.create({
      data: {
        title: body.title,
        slug: body.slug,
        shortDesc: body.shortDesc,
        description: body.description,
        overview: body.overview,
        process: body.process,
        recovery: body.recovery,
        benefits: body.benefits || [],
        images: body.images || [],
        category: body.category,
        price: body.price != null && body.price !== "" ? parseFloat(body.price) : null,
        discountPrice: body.discountPrice != null && body.discountPrice !== "" ? parseFloat(body.discountPrice) : null,
        order: body.order || 0,
        isActive: body.isActive ?? true,
        translations: body.translations || null,
      },
    });

    revalidatePath("/", "layout");
    return NextResponse.json(service, { status: 201 });
  } catch (error) {
    console.error("Error creating service:", error);
    return NextResponse.json(
      { error: "Failed to create service" },
      { status: 500 }
    );
  }
}
