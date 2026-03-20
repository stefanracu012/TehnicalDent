import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { sanitizeObject, validateNoInjection } from "@/lib/security";

export async function GET() {
  try {
    const members = await prisma.teamMember.findMany({
      orderBy: { order: "asc" },
    });
    return NextResponse.json(members);
  } catch (error) {
    console.error("Error fetching team:", error);
    return NextResponse.json(
      { error: "Failed to fetch team members" },
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
    const body = sanitizeObject(rawBody, ["description"]);

    if (!body.name || !body.role || !body.description) {
      return NextResponse.json(
        { error: "Numele, rolul și descrierea sunt obligatorii." },
        { status: 400 },
      );
    }

    const member = await prisma.teamMember.create({
      data: {
        name: body.name,
        role: body.role,
        description: body.description,
        image: body.image || "",
        order: body.order || 0,
        isActive: body.isActive ?? true,
        translations: body.translations || null,
      },
    });

    revalidatePath("/", "layout");
    return NextResponse.json(member, { status: 201 });
  } catch (error) {
    console.error("Error creating team member:", error);
    return NextResponse.json(
      { error: "Failed to create team member" },
      { status: 500 },
    );
  }
}
