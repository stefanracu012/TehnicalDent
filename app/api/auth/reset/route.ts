// =============================================
// "Forgot password", step 2: exchange the emailed code for a new password.
// =============================================

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/password";

const MAX_ATTEMPTS = 5;
const INVALID = { error: "Cod invalid sau expirat." };

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      email?: string;
      code?: string;
      password?: string;
    };
    const email = String(body.email || "").toLowerCase().trim();
    const code = String(body.code || "").trim();
    const password = String(body.password || "");

    if (!email || !code) {
      return NextResponse.json(
        { error: "Completați emailul și codul primit." },
        { status: 400 },
      );
    }
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Parola nouă trebuie să aibă minim 8 caractere." },
        { status: 400 },
      );
    }

    const reset = await prisma.passwordReset.findFirst({
      where: { email, usedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    });
    if (!reset) return NextResponse.json(INVALID, { status: 400 });

    // Burn the code after a handful of wrong guesses, so a 6-digit code can't
    // be walked through.
    if (reset.attempts >= MAX_ATTEMPTS) {
      await prisma.passwordReset.update({
        where: { id: reset.id },
        data: { usedAt: new Date() },
      });
      return NextResponse.json(
        { error: "Prea multe încercări. Cereți un cod nou." },
        { status: 429 },
      );
    }

    if (!(await verifyPassword(code, reset.codeHash))) {
      await prisma.passwordReset.update({
        where: { id: reset.id },
        data: { attempts: { increment: 1 } },
      });
      return NextResponse.json(INVALID, { status: 400 });
    }

    const user = await prisma.adminUser.findUnique({ where: { email } });
    if (!user?.isActive) return NextResponse.json(INVALID, { status: 400 });

    await prisma.adminUser.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(password) },
    });
    await prisma.passwordReset.update({
      where: { id: reset.id },
      data: { usedAt: new Date() },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error completing password reset:", error);
    return NextResponse.json({ error: "Resetarea a eșuat." }, { status: 500 });
  }
}
