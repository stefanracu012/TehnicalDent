// =============================================
// The signed-in user's own account. Deliberately not covered by the page
// permissions: changing your own password must work for every account,
// including one with no pages assigned yet.
// =============================================

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/password";
import { getSession } from "@/lib/auth-server";
import { isOwnerEmail } from "@/lib/owner";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Neautorizat." }, { status: 401 });
  }

  return NextResponse.json({
    email: session.email,
    name: session.name,
    isOwner: isOwnerEmail(session.email),
  });
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Neautorizat." }, { status: 401 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as {
      currentPassword?: string;
      newPassword?: string;
      name?: string;
    };

    const user = await prisma.adminUser.findUnique({ where: { id: session.sub } });
    if (!user) {
      return NextResponse.json(
        { error: "Contul nu a fost găsit. Reautentificați-vă." },
        { status: 404 },
      );
    }

    const data: Record<string, unknown> = {};

    if (typeof body.name === "string" && body.name.trim()) {
      data.name = body.name.trim();
    }

    if (body.newPassword) {
      if (body.newPassword.length < 8) {
        return NextResponse.json(
          { error: "Parola nouă trebuie să aibă minim 8 caractere." },
          { status: 400 },
        );
      }
      // Knowing the current password is what separates "the account owner is
      // changing it" from "someone walked up to an unlocked browser".
      const ok =
        typeof body.currentPassword === "string" &&
        (await verifyPassword(body.currentPassword, user.passwordHash));
      if (!ok) {
        return NextResponse.json(
          { error: "Parola actuală este incorectă." },
          { status: 403 },
        );
      }
      data.passwordHash = await hashPassword(body.newPassword);
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Nimic de salvat." }, { status: 400 });
    }

    await prisma.adminUser.update({ where: { id: user.id }, data });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error updating own account:", error);
    return NextResponse.json({ error: "Salvarea a eșuat." }, { status: 500 });
  }
}
