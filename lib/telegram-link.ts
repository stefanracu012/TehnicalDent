// =============================================
// Turning a one-time code into a connected chat.
//
// Called from the Telegram webhook before it decides whether the chat is
// allowed to talk to the bot — an unconnected chat is precisely the case this
// handles, so the access check would reject every attempt.
// =============================================

import prisma from "@/lib/prisma";

/**
 * Connects the chat to whichever account asked for this code.
 *
 * Returns the message to send back, in every case: the person is standing in
 * a chat waiting for something to happen, and "nothing happened" is the one
 * answer that leaves them stuck.
 */
export async function consumeTelegramLink(
  code: string,
  chatId: string,
): Promise<string> {
  const link = await prisma.telegramLink.findUnique({ where: { code } });

  if (!link || link.usedAt) {
    return (
      "❌ Codul nu mai este valabil.\n\n" +
      "Deschideți din nou Contul meu în panou și apăsați „Conectează Telegram”."
    );
  }

  if (link.expiresAt.getTime() < Date.now()) {
    await prisma.telegramLink.delete({ where: { id: link.id } }).catch(() => {});
    return (
      "❌ Codul a expirat.\n\n" +
      "Generați altul din Contul meu — sunt valabile 15 minute."
    );
  }

  const user = await prisma.adminUser.findUnique({
    where: { id: link.adminUserId },
    select: { id: true, name: true, isActive: true },
  });
  if (!user || !user.isActive) {
    return "❌ Contul nu mai există sau a fost dezactivat.";
  }

  // One chat, one account. Leaving the id on an old account would send that
  // person someone else's patients.
  await prisma.adminUser.updateMany({
    where: { telegramId: chatId, id: { not: user.id } },
    data: { telegramId: null },
  });

  await prisma.adminUser.update({
    where: { id: user.id },
    data: { telegramId: chatId },
  });
  await prisma.telegramLink.update({
    where: { id: link.id },
    data: { usedAt: new Date() },
  });

  return (
    `✅ Gata, ${user.name}. Contul dumneavoastră este conectat.\n\n` +
    "Aici veți primi programările proprii, imediat ce sunt făcute, și lista " +
    "pacienților de dimineață, cu butoane pentru „Finalizat” și „Nu a venit”."
  );
}
