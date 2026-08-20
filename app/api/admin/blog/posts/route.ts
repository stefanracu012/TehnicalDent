import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sanitizeObject, validateNoInjection } from "@/lib/security";
import { publishSocialPostById } from "@/lib/social-publish";

// Social posts live under /api/admin/blog so they inherit the "blog" permission
// from the first path segment. An unmapped segment would grant access to any
// signed-in account regardless of its permissions.
//
// The static "posts" segment wins over the sibling [id] route.

/** Captions keep their newlines and emoji, so they get the lighter sanitiser. */
const TEXT_FIELDS = ["facebookCaption", "instagramCaption"];

export async function GET() {
  try {
    const posts = await prisma.socialPost.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(posts);
  } catch (error) {
    console.error("Error fetching social posts:", error);
    return NextResponse.json(
      { error: "Failed to fetch social posts" },
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
    const body = sanitizeObject(rawBody, TEXT_FIELDS);

    const images = Array.isArray(body.images) ? body.images.slice(0, 10) : [];
    if (images.length === 0) {
      return NextResponse.json(
        { error: "Adăugați cel puțin o imagine." },
        { status: 400 },
      );
    }

    const post = await prisma.socialPost.create({
      data: {
        title: body.title || "Postare fără titlu",
        images,
        facebookCaption: body.facebookCaption || "",
        instagramCaption: body.instagramCaption || "",
        tags: Array.isArray(body.tags) ? body.tags : [],
        articleSlug: body.articleSlug || null,
        isPublished: body.isPublished ?? false,
        publishedAt: body.isPublished ? new Date() : null,
      },
    });

    // Publishing must not fail the save — the post is already stored, and any
    // error is recorded on the record for the admin to see.
    const social = await publishSocialPostById(post.id).catch((error) => {
      console.error("Social publish failed:", error);
      return null;
    });

    return NextResponse.json({ ...post, social }, { status: 201 });
  } catch (error) {
    console.error("Error creating social post:", error);
    return NextResponse.json(
      { error: "Failed to create social post" },
      { status: 500 },
    );
  }
}
