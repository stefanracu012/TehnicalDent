import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { sanitizeObject, validateNoInjection } from "@/lib/security";

export async function GET() {
  try {
    const posts = await prisma.blogPost.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(posts);
  } catch (error) {
    console.error("Error fetching blog posts:", error);
    return NextResponse.json(
      { error: "Failed to fetch blog posts" },
      { status: 500 },
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

    const body = sanitizeObject(rawBody, ["content"]);

    if (!body.title || !body.content || !body.slug) {
      return NextResponse.json(
        { error: "Titlul, slug-ul și conținutul sunt obligatorii." },
        { status: 400 },
      );
    }

    const existing = await prisma.blogPost.findUnique({
      where: { slug: body.slug },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Există deja un articol cu acest slug." },
        { status: 409 },
      );
    }

    const post = await prisma.blogPost.create({
      data: {
        slug: body.slug,
        title: body.title,
        excerpt: body.excerpt || "",
        content: body.content,
        coverImage: body.coverImage || "",
        category: body.category || "General",
        tags: body.tags || [],
        author: body.author || "TechnicalDent",
        isPublished: body.isPublished ?? false,
        publishedAt: body.isPublished ? new Date() : null,
        translations: body.translations || null,
      },
    });

    revalidatePath("/", "layout");
    return NextResponse.json(post, { status: 201 });
  } catch (error) {
    console.error("Error creating blog post:", error);
    return NextResponse.json(
      { error: "Failed to create blog post" },
      { status: 500 },
    );
  }
}
