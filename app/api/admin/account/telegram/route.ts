// =============================================
// Linking your own Telegram to your own account.
//
// Like the account route beside it, this is deliberately outside the page
// permissions: connecting your notifications is yours to do whatever pages
// you were given. It only ever touches the signed-in account.
// =============================================

import crypto from "crypto";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";

const BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME || "tehnical_dent_bot";
const CODE_TTL_MINUTES = 15;

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Neautorizat." }, { status: 401 });
  }

  const user = await prisma.adminUser.findUnique({
    where: { id: session.sub },
    select: { telegramId: true },
  });

  return NextResponse.json({
    connected: Boolean(user?.telegramId),
    telegramId: user?.telegramId ?? null,
    bot: BOT_USERNAME,
  });
}

/** Issues a fresh one-time code and the deep link that carries it. */
export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Neautorizat." }, { status: 401 });
  }

  try {
    // Any earlier code for this account stops working the moment a new one is
    // asked for, so a link left open in a chat somewhere cannot be used later.
    await prisma.telegramLink.deleteMany({ where: { adminUserId: session.sub } });

    const code = crypto.randomBytes(8).toString("hex");
    const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000);

    await prisma.telegramLink.create({
      data: { code, adminUserId: session.sub, expiresAt },
    });

    return NextResponse.json({
      link: `https://t.me/${BOT_USERNAME}?start=${code}`,
      expiresAt: expiresAt.toISOString(),
      minutes: CODE_TTL_MINUTES,
    });
  } catch (error) {
    console.error("Error creating Telegram link code:", error);
    return NextResponse.json(
      { error: "Nu am putut genera linkul." },
      { status: 500 },
    );
  }
}

/** Disconnects, so notifications stop reaching a chat you no longer use. */
export async function DELETE() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Neautorizat." }, { status: 401 });
  }

  try {
    await prisma.adminUser.update({
      where: { id: session.sub },
      data: { telegramId: null },
    });
    await prisma.telegramLink.deleteMany({ where: { adminUserId: session.sub } });
    return NextResponse.json({ connected: false });
  } catch (error) {
    console.error("Error disconnecting Telegram:", error);
    return NextResponse.json(
      { error: "Nu am putut deconecta." },
      { status: 500 },
    );
  }
}
