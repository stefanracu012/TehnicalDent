// =============================================
// "Forgot password", step 1: email a one-time code.
//
// The response never says whether the address belongs to an account —
// otherwise this endpoint becomes a way to enumerate the clinic's staff
// emails. Rate limiting lives in proxy.ts.
// =============================================

import { NextResponse } from "next/server";
import { randomInt } from "crypto";
import prisma from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { sendDirectEmail } from "@/lib/notifications";

export const RESET_CODE_TTL_MS = 15 * 60_000;

const GENERIC_OK = {
  ok: true,
  message:
    "Dacă adresa este asociată unui cont, veți primi un cod de resetare în câteva minute.",
};

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { email?: string };
    const email = String(body.email || "").toLowerCase().trim();
    if (!email) {
      return NextResponse.json({ error: "Introduceți adresa de email." }, { status: 400 });
    }

    const user = await prisma.adminUser.findUnique({ where: { email } });
    if (!user?.isActive) return NextResponse.json(GENERIC_OK);

    // A new request invalidates any earlier code, so an intercepted older
    // email stops working the moment a fresh one is asked for.
    await prisma.passwordReset.updateMany({
      where: { email, usedAt: null },
      data: { usedAt: new Date() },
    });

    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    await prisma.passwordReset.create({
      data: {
        email,
        codeHash: await hashPassword(code),
        expiresAt: new Date(Date.now() + RESET_CODE_TTL_MS),
      },
    });

    await sendDirectEmail(email, {
      subject: "Cod de resetare a parolei — TehnicalDent Admin",
      text:
        `Codul dumneavoastră de resetare este ${code}.\n\n` +
        "Este valabil 15 minute. Dacă nu ați cerut resetarea parolei, ignorați acest mesaj.",
      html:
        `<p>Codul dumneavoastră de resetare este <strong style="font-size:20px;letter-spacing:3px">${code}</strong>.</p>` +
        "<p>Este valabil 15 minute. Dacă nu ați cerut resetarea parolei, ignorați acest mesaj.</p>",
    });

    return NextResponse.json(GENERIC_OK);
  } catch (error) {
    // Includes SMTP failures: surfaced, because a user staring at "check your
    // inbox" for an email that will never arrive is worse than an error.
    console.error("Error starting password reset:", error);
    return NextResponse.json(
      { error: "Nu am putut trimite codul. Încercați din nou mai târziu." },
      { status: 500 },
    );
  }
}
