import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { signSession, SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/session";
import { ALL_PERMISSION_KEYS } from "@/lib/permissions";

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

    // Owner account from env vars — always full access, so an empty or
    // misconfigured AdminUser table can never lock everyone out.
    const ownerEmail = process.env.ADMIN_EMAIL;
    const ownerPassword = process.env.ADMIN_PASSWORD;
    if (ownerEmail && ownerPassword && email === ownerEmail && password === ownerPassword) {
      token = await signSession({
        sub: "owner",
        email: ownerEmail,
        name: "Administrator",
        perms: ALL_PERMISSION_KEYS,
      });
    } else {
      const user = await prisma.adminUser.findUnique({
        where: { email: email.toLowerCase().trim() },
      });
      if (user?.isActive && (await verifyPassword(password, user.passwordHash))) {
        token = await signSession({
          sub: user.id,
          email: user.email,
          name: user.name,
          perms: user.permissions,
          ...(user.teamMemberId ? { doctorId: user.teamMemberId } : {}),
        });
      }
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
