// Who changed an appointment's status, and from where.
//
// Appointments were turning up cancelled with nobody knowing how: four
// different places can cancel one, and none of them wrote down who pressed the
// button. Every status change now leaves a line here, the "Anulări" Telegram
// topic says who cancelled, and the appointment window in the panel shows the
// whole history.

import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";

export type ChangeVia = "panou" | "kanban" | "telegram" | "link";

const VIA_LABEL: Record<ChangeVia, string> = {
  panou: "din panou",
  kanban: "din Kanban",
  telegram: "din Telegram",
  link: "din linkul primit",
};

/** The colleague acting in the admin panel, by name. */
export async function panelActor(): Promise<string> {
  const session = await getSession().catch(() => null);
  return session?.name || session?.email || "cineva din panou";
}

/** The person who pressed a Telegram button, by name. */
export function telegramActor(from: { first_name?: string; last_name?: string; username?: string }): string {
  const name = [from.first_name, from.last_name].filter(Boolean).join(" ");
  return name || (from.username ? `@${from.username}` : "cineva din Telegram");
}

/**
 * Records a status change. Never throws: losing a history line must not undo
 * a cancellation reception meant to make.
 */
export async function logStatusChange(
  appointmentId: string,
  status: string,
  by: string,
  via: ChangeVia,
): Promise<void> {
  try {
    await prisma.appointmentLog.create({ data: { appointmentId, status, by, via } });
  } catch (error) {
    console.error("logStatusChange:", error);
  }
}

/** The "Motiv:" line of the cancellation message in the "Anulări" topic. */
export function cancelReason(by: string, via: ChangeVia): string {
  if (via === "link") return "Anulat de pacient, din linkul primit";
  return `Anulat ${VIA_LABEL[via]} de ${by}`;
}

/** Oldest first, for the appointment window. */
export async function statusHistory(appointmentId: string) {
  return prisma.appointmentLog.findMany({
    where: { appointmentId },
    orderBy: { createdAt: "asc" },
    select: { status: true, by: true, via: true, createdAt: true },
  });
}
