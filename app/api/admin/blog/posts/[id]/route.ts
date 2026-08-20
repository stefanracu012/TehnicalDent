import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sanitizeObject, validateNoInjection } from "@/lib/security";
import { publishSocialPostById } from "@/lib/social-publish";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const TEXT_FIELDS = ["facebookCaption", "instagramCaption"];

export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  try {
    const post = await prisma.socialPost.findUnique({ where: { id } });
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }
    return NextResponse.json(post);
  } catch (error) {
    console.error("Error fetching social post:", error);
    return NextResponse.json(
      { error: "Failed to fetch social post" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params;
  try {
    const rawBody = await request.json();

    if (!validateNoInjection(rawBody)) {
      return NextResponse.json(
        { error: "Input invalid detectat." },
        { status: 400 },
      );
    }
    const body = sanitizeObject(rawBody, TEXT_FIELDS);

    if (Array.isArray(body.images)) body.images = body.images.slice(0, 10);

    if (body.isPublished === true) {
      const existing = await prisma.socialPost.findUnique({ where: { id } });
      if (existing && !existing.publishedAt) body.publishedAt = new Date();
    }
    if (body.isPublished === false) body.publishedAt = null;

    const post = await prisma.socialPost.update({ where: { id }, data: body });

    // Only acts the first time the post goes out; editing a published post
    // never re-posts it.
    const social = await publishSocialPostById(post.id).catch((error) => {
      console.error("Social publish failed:", error);
      return null;
    });

    return NextResponse.json({ ...post, social });
  } catch (error) {
    console.error("Error updating social post:", error);
    return NextResponse.json(
      { error: "Failed to update social post" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const { id } = await params;
  try {
    // Deletes the record only. Anything already on Facebook or Instagram stays
    // there — removing published posts as a side effect of tidying the admin
    // would be irreversible and is never what the editor meant.
    await prisma.socialPost.delete({ where: { id } });
    return NextResponse.json({ message: "Deleted successfully" });
  } catch (error) {
    console.error("Error deleting social post:", error);
    return NextResponse.json(
      { error: "Failed to delete social post" },
      { status: 500 },
    );
  }
}
