import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { ALL_PERMISSION_KEYS } from "@/lib/permissions";
import { getSession } from "@/lib/auth-server";
import { isOwnerEmail } from "@/lib/owner";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params;

  try {
    const target = await prisma.adminUser.findUnique({
      where: { id },
      select: { email: true },
    });
    if (!target) {
      return NextResponse.json({ error: "Utilizatorul nu există." }, { status: 404 });
    }
    // The owner is defined by the ADMIN_EMAIL env var. Letting its row be
    // deactivated or stripped of permissions here would lock the clinic out
    // of its own admin, so those two fields are simply not editable.
    const isOwner = isOwnerEmail(target.email);

    const body = await request.json();
    const data: Record<string, unknown> = {};

    if (typeof body.name === "string" && body.name.trim()) {
      data.name = body.name.trim();
    }
    if (typeof body.isActive === "boolean" && !isOwner) {
      data.isActive = body.isActive;
    }
    if ("teamMemberId" in body) {
      data.teamMemberId = body.teamMemberId ? String(body.teamMemberId) : null;
    }
    if (Array.isArray(body.permissions) && !isOwner) {
      data.permissions = body.permissions.filter(
        (p: unknown): p is string =>
          typeof p === "string" && ALL_PERMISSION_KEYS.includes(p),
      );
    }
    if (typeof body.password === "string" && body.password) {
      if (body.password.length < 8) {
        return NextResponse.json(
          { error: "Parola trebuie să aibă minim 8 caractere." },
          { status: 400 },
        );
      }
      data.passwordHash = await hashPassword(body.password);
    }

    const user = await prisma.adminUser.update({
      where: { id },
      data,
      select: { id: true, email: true, name: true, permissions: true, isActive: true },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error updating admin user:", error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { id } = await params;

  try {
    // Deleting the account you're signed in with would leave the session
    // valid but pointing at nothing until it expires.
    const session = await getSession();
    if (session?.sub === id) {
      return NextResponse.json(
        { error: "Nu vă puteți șterge propriul cont." },
        { status: 400 },
      );
    }

    const target = await prisma.adminUser.findUnique({
      where: { id },
      select: { email: true },
    });
    if (target && isOwnerEmail(target.email)) {
      return NextResponse.json(
        { error: "Contul principal de administrator nu poate fi șters." },
        { status: 400 },
      );
    }

    await prisma.adminUser.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error deleting admin user:", error);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}
