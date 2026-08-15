import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/password";
import { signSession, SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/session";
import { SUPER_ADMIN } from "@/lib/permissions";
import { isOwnerEmail, ownerCredentialsMatch } from "@/lib/owner";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    if (typeof email !== "string" || typeof password !== "string") {
      return NextResponse.json({ error: "Date lipsă." }, { status: 400 });
    }

    if (!process.env.ADMIN_SESSION_SECRET) {
      console.error("Missing ADMIN_SESSION_SECRET env var");
      return NextResponse.json(
        { error: "Autentificarea nu este configurată pe server." },
        { status: 500 },
      );
    }

    let token: string | null = null;
    const normalizedEmail = email.toLowerCase().trim();

    // Stored accounts are checked first, so a password changed from the admin
    // UI takes effect for the owner too.
    const user = await prisma.adminUser.findUnique({
      where: { email: normalizedEmail },
    });
    if (user?.isActive && (await verifyPassword(password, user.passwordHash))) {
      token = await signSession({
        sub: user.id,
        email: user.email,
        name: user.name,
        perms: isOwnerEmail(user.email) ? [SUPER_ADMIN] : user.permissions,
        ...(user.teamMemberId ? { doctorId: user.teamMemberId } : {}),
      });
    } else if (
      ownerCredentialsMatch(normalizedEmail, password) &&
      // A stored owner row with a different password means the password was
      // deliberately changed; the env pair stays valid as the documented
      // recovery path only while no such row exists.
      !user
    ) {
      // Give the owner a real row on first login, so the account shows up in
      // the users screen and its password can be changed like any other.
      const owner = await prisma.adminUser.create({
        data: {
          email: normalizedEmail,
          name: "Administrator",
          passwordHash: await hashPassword(password),
          permissions: [SUPER_ADMIN],
        },
      });
      token = await signSession({
        sub: owner.id,
        email: owner.email,
        name: owner.name,
        perms: [SUPER_ADMIN],
      });
    }

    if (!token) {
      return NextResponse.json({ error: "Email sau parolă incorectă." }, { status: 401 });
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });
    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Eroare la autentificare." }, { status: 500 });
  }
}
