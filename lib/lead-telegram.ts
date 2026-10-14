// =============================================
// Leads on Telegram — only what needs a person.
//
// Modelled on the Olla CRM: nothing is sent per chat message. A lead reaches
// Telegram when somebody has to act on it — it is urgent, it is new and nobody
// answers it automatically, it has just been assigned to someone, or its
// follow-up date has come. Every card carries the status buttons, so the action
// can be closed from the phone without opening the panel.
// =============================================

import prisma from "@/lib/prisma";
import {
  TELEGRAM_TOPICS,
  answerCallbackQuery,
  editTelegramMessageIn,
  sendTelegramMessage,
  sendTelegramToChat,
} from "@/lib/telegram";
import { CLOSED_STATUSES, getSource, getStatus } from "@/lib/leads-config";
import { clinicDaysAgo, formatFollowUp } from "@/lib/chisinau-time";
import type { Lead, LeadStatus } from "@prisma/client";

const BASE = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.tehnicaldent.com").replace(/\/$/, "");

const escapeHtml = (s: unknown) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");


/** The chat a lead came from, as the inbox addresses it. */
function conversationOf(lead: Pick<Lead, "source" | "sourceKey">) {
  if (lead.source !== "messenger" && lead.source !== "instagram" && lead.source !== "whatsapp") {
    return null;
  }
  const personId = lead.sourceKey.slice(lead.source.length + 1);
  return personId ? { platform: lead.source, personId } : null;
}

async function staffById(ids: (string | null)[]) {
  const wanted = [...new Set(ids.filter((id): id is string => Boolean(id)))];
  if (wanted.length === 0) return new Map<string, { name: string; telegramId: string | null }>();
  const rows = await prisma.adminUser.findMany({
    where: { id: { in: wanted } },
    select: { id: true, name: true, email: true, telegramId: true },
  });
  return new Map(rows.map((u) => [u.id, { name: u.name || u.email, telegramId: u.telegramId }]));
}

/** The lead, the way every card shows it. */
function cardLines(lead: Lead, assigneeName: string | null): string[] {
  const source = getSource(lead.source);
  const status = getStatus(lead.status);
  const lines = [
    `👤 Nume: <b>${escapeHtml(lead.name || "fără nume")}</b>`,
    `📥 Sursă: <b>${source.emoji} ${escapeHtml(source.label)}</b>${
      lead.sourceDetail ? ` — ${escapeHtml(lead.sourceDetail)}` : ""
    }`,
    `📱 Telefon: <b>${escapeHtml(lead.phone || "—")}</b>`,
  ];
  if (lead.email) lines.push(`📧 Email: ${escapeHtml(lead.email)}`);
  if (lead.interestedIn) lines.push(`🦷 Îl interesează: ${escapeHtml(lead.interestedIn)}`);
  lines.push(
    "",
    `📊 Status: ${status.emoji} ${escapeHtml(status.label)}`,
    `🙋 Responsabil: ${assigneeName ? `<b>${escapeHtml(assigneeName)}</b>` : "<i>nimeni încă</i>"}`,
    `🔔 Recontactare: ${lead.followUpAt ? `<b>${formatFollowUp(lead.followUpAt)}</b>` : "<i>nesetată</i>"}`,
  );
  if (lead.firstMessage) {
    const text = lead.firstMessage.length > 300 ? `${lead.firstMessage.slice(0, 300)}…` : lead.firstMessage;
    lines.push("", `💬 ${escapeHtml(text)}`);
  }

  const links = [`<a href="${BASE}/admin/leads/${lead.id}">Fișa în panou</a>`];
  const conversation = conversationOf(lead);
  if (conversation) {
    links.push(
      `<a href="${BASE}/admin/mesaje?platform=${conversation.platform}&person=${encodeURIComponent(
        conversation.personId,
      )}">Conversația</a>`,
    );
  }
  lines.push("", links.join(" · "));
  return lines;
}

/** The statuses a card offers. The same buttons everywhere. */
const BUTTONS: { status: LeadStatus; text: string }[][] = [
  [
    { status: "contactat", text: "🟡 Contactat" },
    { status: "programat", text: "📅 Programat" },
  ],
  [
    { status: "se_gandeste", text: "🤔 Se gândește" },
    { status: "mai_tarziu", text: "🗓️ Mai târziu" },
  ],
  [
    { status: "convertit", text: "✅ Pacient" },
    { status: "pierdut", text: "❌ Pierdut" },
  ],
];
const BUTTON_STATUSES = new Set<string>(BUTTONS.flat().map((b) => b.status));

function keyboard(leadId: string) {
  return {
    inline_keyboard: BUTTONS.map((row) =>
      row.map((b) => ({ text: b.text, callback_data: `lead:${leadId}:${b.status}` })),
    ),
  };
}

export type LeadCardKind = "nou" | "urgent" | "atribuit" | "reminder";

const HEADERS: Record<LeadCardKind, string> = {
  nou: "🎯 <b>LEAD NOU</b>",
  urgent: "🚨 <b>URGENT — trebuie răspuns de la recepție</b>",
  atribuit: "👤 <b>Ți-a fost atribuit un lead</b>",
  reminder: "🔔 <b>REMINDER — DE RECONTACTAT</b>",
};

/**
 * Sends one lead card. To the clinic's lead topic, or — with `chatId` — to one
 * person's private chat. Never throws: a notification must not cost the
 * request that triggered it.
 */
export async function notifyLead(
  kind: LeadCardKind,
  lead: Lead,
  opts: { why?: string; chatId?: string; daysOverdue?: number } = {},
): Promise<boolean> {
  try {
    const staff = await staffById([lead.assignedToId]);
    const assignee = lead.assignedToId ? (staff.get(lead.assignedToId)?.name ?? null) : null;

    const header =
      kind === "reminder" && (opts.daysOverdue ?? 0) > 0
        ? `⏰ <b>REMINDER — RECONTACTARE RESTANTĂ</b> (${opts.daysOverdue} ${
            opts.daysOverdue === 1 ? "zi" : "zile"
          })`
        : HEADERS[kind];

    const text = [
      header,
      ...(opts.why ? [`<i>${escapeHtml(opts.why)}</i>`] : []),
      "",
      ...cardLines(lead, assignee),
    ].join("\n");

    if (opts.chatId) {
      await sendTelegramToChat(opts.chatId, text, { replyMarkup: keyboard(lead.id) });
    } else {
      await sendTelegramMessage(text, {
        threadId: TELEGRAM_TOPICS.leaduri,
        replyMarkup: keyboard(lead.id),
      });
    }
    return true;
  } catch (error) {
    console.error(`notifyLead ${kind} failed:`, error);
    return false;
  }
}

/** A lead given to someone reaches them in private, if they connected Telegram. */
export async function notifyAssigned(lead: Lead): Promise<void> {
  if (!lead.assignedToId) return;
  const owner = (await staffById([lead.assignedToId])).get(lead.assignedToId);
  if (owner?.telegramId) await notifyLead("atribuit", lead, { chatId: owner.telegramId });
}

// ── Follow-ups ──────────────────────────────────────────────────────────────

/**
 * Announces the leads whose follow-up date has come, once per date.
 *
 * The clinic's topic gets one digest — overdue ones apart from today's — and
 * each lead's owner gets the full card with buttons in private. A lead whose
 * date is moved is announced again on the new date; one that was announced
 * and left alone is not repeated, it stays in the panel's "Restante".
 *
 * Idempotent, so the dispatcher can call it on every run.
 */
export async function runLeadFollowUps(now = new Date()) {
  const due = await prisma.lead.findMany({
    where: {
      followUpAt: { not: null, lte: now },
      status: { notIn: CLOSED_STATUSES as LeadStatus[] },
    },
    orderBy: { followUpAt: "asc" },
    take: 100,
  });

  const pending = due.filter(
    (l) => !l.followUpNotifiedAt || l.followUpNotifiedAt < (l.followUpAt as Date),
  );
  if (pending.length === 0) return { notified: 0 };

  const staff = await staffById(pending.map((l) => l.assignedToId));
  const items = pending.map((lead) => ({
    lead,
    owner: lead.assignedToId ? (staff.get(lead.assignedToId) ?? null) : null,
    // Days late by the Chișinău calendar: one due at 23:00 yesterday is a day late.
    daysOverdue: Math.max(0, clinicDaysAgo(lead.followUpAt as Date, now)),
  }));

  const line = ({ lead, owner, daysOverdue }: (typeof items)[number]) => {
    const parts = [`<a href="${BASE}/admin/leads/${lead.id}">${escapeHtml(lead.name || "fără nume")}</a>`];
    if (lead.phone) parts.push(escapeHtml(lead.phone));
    parts.push(`🕒 ${formatFollowUp(lead.followUpAt as Date, false)}`);
    parts.push(`${getStatus(lead.status).emoji} ${escapeHtml(getStatus(lead.status).label)}`);
    // Without Telegram connected the private reminder has nowhere to go —
    // shown here rather than looking like it was lost.
    if (owner) {
      parts.push(
        owner.telegramId
          ? `resp. ${escapeHtml(owner.name)}`
          : `resp. ${escapeHtml(owner.name)} ⚠️ fără Telegram conectat`,
      );
    }
    if (daysOverdue > 0) parts.push(`restant de ${daysOverdue} ${daysOverdue === 1 ? "zi" : "zile"}`);
    return `• ${parts.join(" — ")}`;
  };

  const MAX = 25;
  const section = (title: string, list: typeof items) =>
    list.length === 0
      ? []
      : [
          "",
          `<b>${title} (${list.length})</b>`,
          ...list.slice(0, MAX).map(line),
          ...(list.length > MAX ? [`• …și încă ${list.length - MAX}`] : []),
        ];

  const dateLabel = new Intl.DateTimeFormat("ro-RO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Europe/Chisinau",
  }).format(now);

  let digestSent = false;
  try {
    await sendTelegramMessage(
      [
        `🔔 <b>LEAD-URI DE RECONTACTAT — ${dateLabel}</b>`,
        ...section("⚠️ Restante", items.filter((i) => i.daysOverdue > 0)),
        ...section("📅 Azi", items.filter((i) => i.daysOverdue === 0)),
      ].join("\n"),
      { threadId: TELEGRAM_TOPICS.leaduri },
    );
    digestSent = true;
  } catch (error) {
    console.error("Lead follow-up digest failed:", error);
  }

  let directMessages = 0;
  for (const { lead, owner, daysOverdue } of items) {
    if (!owner?.telegramId) continue;
    if (await notifyLead("reminder", lead, { chatId: owner.telegramId, daysOverdue })) {
      directMessages++;
    }
  }

  await prisma.lead.updateMany({
    where: { id: { in: pending.map((l) => l.id) } },
    data: { followUpNotifiedAt: now },
  });

  return { notified: pending.length, digestSent, directMessages };
}

// ── Buttons ─────────────────────────────────────────────────────────────────

interface LeadButtonPress {
  id: string;
  data?: string;
  from: { id: number; first_name?: string };
  message?: { message_id: number; chat: { id: number } };
}

/**
 * A status button pressed on a lead card, in the group or in private.
 *
 * Changes the status, leaves a note saying who did it from Telegram, and
 * rewrites the card so the chat shows where the lead stands now. A closed lead
 * loses its buttons.
 */
export async function handleLeadButton(press: LeadButtonPress): Promise<void> {
  const match = (press.data ?? "").match(/^lead:([a-f0-9]{24}):([a-z_0-9]+)$/);
  if (!match || !BUTTON_STATUSES.has(match[2])) {
    await answerCallbackQuery(press.id, "❌ Buton necunoscut.");
    return;
  }
  const [, leadId, status] = match;

  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) {
    await answerCallbackQuery(press.id, "Leadul nu mai există.");
    if (press.message) {
      await editTelegramMessageIn(
        press.message.chat.id,
        press.message.message_id,
        "🗑 Lead șters din panou.",
        null,
      );
    }
    return;
  }

  try {
    if (status === "convertit" && !lead.patientId) {
      // The same path as the panel: a patient needs a phone, and one already
      // on that number is linked rather than duplicated.
      const { convertLeadToPatient } = await import("@/lib/leads");
      await convertLeadToPatient(leadId);
    } else {
      await prisma.lead.update({
        where: { id: leadId },
        data: {
          status: status as LeadStatus,
          ...(CLOSED_STATUSES.includes(status as never) ? { followUpAt: null } : {}),
        },
      });
    }
  } catch (error) {
    await answerCallbackQuery(
      press.id,
      error instanceof Error && "status" in error ? error.message : "❌ Nu am putut schimba statusul.",
    );
    return;
  }

  const who =
    (
      await prisma.adminUser.findFirst({
        where: { telegramId: String(press.from.id) },
        select: { name: true },
      })
    )?.name ??
    press.from.first_name ??
    "Telegram";

  const info = getStatus(status);
  await prisma.leadNote
    .create({ data: { leadId, content: `${info.emoji} ${info.label} — din Telegram`, authorName: who } })
    .catch(() => {});

  await answerCallbackQuery(press.id, `${info.emoji} ${info.label}`);

  if (press.message) {
    const fresh = await prisma.lead.findUnique({ where: { id: leadId } });
    if (fresh) {
      const staff = await staffById([fresh.assignedToId]);
      const time = new Intl.DateTimeFormat("ro-RO", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Europe/Chisinau",
      }).format(new Date());
      const text = [
        `✏️ <b>Actualizat de ${escapeHtml(who)}, ${time}</b>`,
        "",
        ...cardLines(fresh, fresh.assignedToId ? (staff.get(fresh.assignedToId)?.name ?? null) : null),
      ].join("\n");
      await editTelegramMessageIn(
        press.message.chat.id,
        press.message.message_id,
        text,
        CLOSED_STATUSES.includes(fresh.status as never) ? null : keyboard(leadId),
      );
    }
  }
}
