import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

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
    const body = await request.json();

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
      },
    });

    return NextResponse.json(member, { status: 201 });
  } catch (error) {
    console.error("Error creating team member:", error);
    return NextResponse.json(
      { error: "Failed to create team member" },
      { status: 500 },
    );
  }
}
