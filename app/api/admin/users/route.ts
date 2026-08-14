import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { ALL_PERMISSION_KEYS } from "@/lib/permissions";

export async function GET() {
  try {
    const users = await prisma.adminUser.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        email: true,
        name: true,
        permissions: true,
        isActive: true,
        teamMemberId: true,
        createdAt: true,
      },
    });
    return NextResponse.json(users);
  } catch (error) {
    console.error("Error fetching admin users:", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email || "").toLowerCase().trim();
    const name = String(body.name || "").trim();
    const password = String(body.password || "");
    const teamMemberId = body.teamMemberId ? String(body.teamMemberId) : null;
    const permissions = Array.isArray(body.permissions)
      ? body.permissions.filter((p: unknown): p is string =>
          typeof p === "string" && ALL_PERMISSION_KEYS.includes(p),
        )
      : [];

    if (!email || !name || password.length < 8) {
      return NextResponse.json(
        { error: "Email, nume și parolă (minim 8 caractere) sunt obligatorii." },
        { status: 400 },
      );
    }

    const existing = await prisma.adminUser.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "Există deja un utilizator cu acest email." },
        { status: 409 },
      );
    }

    const user = await prisma.adminUser.create({
      data: {
        email,
        name,
        passwordHash: await hashPassword(password),
        permissions,
        teamMemberId,
      },
      select: { id: true, email: true, name: true, permissions: true, isActive: true },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error("Error creating admin user:", error);
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}
