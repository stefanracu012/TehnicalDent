import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { sanitizeObject, validateNoInjection } from "@/lib/security";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params;

  try {
    const rawBody = await request.json();

    // Security: validate & sanitize input
    if (!validateNoInjection(rawBody)) {
      return NextResponse.json(
        { error: "Input invalid detectat." },
        { status: 400 },
      );
    }
    const body = sanitizeObject(rawBody, ["content"]);

    const testimonial = await prisma.testimonial.update({
      where: { id },
      data: body,
    });
    revalidatePath("/", "layout");
    return NextResponse.json(testimonial);
  } catch (error) {
    console.error("Error updating testimonial:", error);
    return NextResponse.json(
      { error: "Failed to update testimonial" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const { id } = await params;

  try {
    await prisma.testimonial.delete({ where: { id } });
    revalidatePath("/", "layout");
    return NextResponse.json({ message: "Deleted successfully" });
  } catch (error) {
    console.error("Error deleting testimonial:", error);
    return NextResponse.json(
      { error: "Failed to delete testimonial" },
      { status: 500 },
    );
  }
}
