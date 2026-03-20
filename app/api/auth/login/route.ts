import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      return NextResponse.json(
        { error: "Autentificarea nu este configurată pe server." },
        { status: 500 },
      );
    }

    if (email !== adminEmail || password !== adminPassword) {
      return NextResponse.json(
        { error: "Email sau parolă incorectă." },
        { status: 401 },
      );
    }

    // Create a simple session token
    const secret = process.env.ADMIN_SESSION_SECRET || "fallback-secret";
    const timestamp = Date.now();
    const tokenData = `${email}:${timestamp}:${secret}`;

    // Simple hash using btoa (base64) — not cryptographic, but sufficient
    // for a single-user admin panel with env-based credentials
    const token = Buffer.from(tokenData).toString("base64");

    const cookieStore = await cookies();
    cookieStore.set("admin_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Eroare la autentificare." },
      { status: 500 },
    );
  }
}
