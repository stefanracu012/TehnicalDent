// =============================================
// Leads — people who reached out and are not patients yet.
//
// Every inbound channel funnels through captureLead, which is deliberately
// forgiving: a lead is worth having even when all we know is that someone
// wrote. Details fill in as they arrive.
// =============================================

import prisma from "@/lib/prisma";
import { notifyLead } from "@/lib/lead-telegram";
import { EARLY_STATUSES, getStatus } from "@/lib/leads-config";
import { formatDateTimeRo } from "@/lib/appointments";
import type { Lead, LeadSource, LeadStatus, Prisma } from "@prisma/client";

/**
 * Moldovan numbers, as people actually type them.
 *
 * Either a +373 / 373 prefix or a leading 0, then eight digits, with any mix of
 * spaces, dots, dashes and brackets between. The prefix is required — without
 * it every price and date in a message would look like a phone number.
 */
const PHONE_RE = /(?:\+?\s*373|0)[\s.\-()]*(?:\d[\s.\-()]*){8}/g;

/** Normalises to E.164, or null when the digits do not add up. */
export function normalisePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  const national = digits.startsWith("373")
    ? digits.slice(3)
    : digits.startsWith("0")
      ? digits.slice(1)
      : digits;
  return national.length === 8 ? `+373${national}` : null;
}

/** The first phone number in a block of text, if there is one. */
export function extractPhone(text: string): string | null {
  for (const match of text.match(PHONE_RE) ?? []) {
    const phone = normalisePhone(match);
    if (phone) return phone;
  }
  return null;
}

interface CaptureInput {
  source: LeadSource;
  /** Conversation or submission id — the same person must always produce the same key. */
  reference: string;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  /** Message text, scanned for a phone number when none was supplied. */
  message?: string | null;
  /** What they asked about, when the channel says so (the form has a service field). */
  interest?: string | null;
}

/**
 * Records a lead, or fills in what a later message revealed.
 *
 * Only ever adds: a second message never blanks a name or phone captured
 * earlier, and never resets a status somebody has moved on. Converted and lost
 * leads are left alone entirely — a follow-up message should not drag a closed
 * lead back into the queue behind reception's back.
 *
 * Says whether the lead is new, so the caller can decide whether somebody has
 * to hear about it — and null when it failed.
 *
 * Never throws. A failure here must not cost the message that triggered it.
 */
export async function captureLead(
  input: CaptureInput,
): Promise<{ lead: Lead; created: boolean } | null> {
  try {
    const sourceKey = `${input.source}:${input.reference}`;
    const phone =
      input.phone ?? (input.message ? extractPhone(input.message) : null);

    const existing = await prisma.lead.findUnique({ where: { sourceKey } });

    if (!existing) {
      const lead = await prisma.lead.create({
        data: {
          sourceKey,
          source: input.source,
          name: input.name ?? null,
          phone,
          email: input.email ?? null,
          firstMessage: input.message?.slice(0, 500) ?? null,
          interestedIn: input.interest ?? null,
        },
      });
      return { lead, created: true };
    }

    const patch: Record<string, string> = {};
    if (!existing.name && input.name) patch.name = input.name;
    if (!existing.phone && phone) patch.phone = phone;
    if (!existing.email && input.email) patch.email = input.email;
    if (!existing.interestedIn && input.interest) patch.interestedIn = input.interest;

    const lead =
      Object.keys(patch).length > 0
        ? await prisma.lead.update({ where: { sourceKey }, data: patch })
        : existing;
    return { lead, created: false };
  } catch (error) {
    console.error("captureLead failed:", error);
    return null;
  }
}

/** A refusal that carries the HTTP status the route should answer with. */
export class LeadError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

/**
 * Turns a lead into a patient, carrying across what is already known.
 *
 * A patient needs a phone, so a lead without one cannot be converted — that is
 * the missing piece to go and ask for, not something to invent a placeholder
 * for. An existing patient on the same number is linked rather than duplicated.
 *
 * Shared by the "Creează pacient" button and by moving a lead to the Pacient
 * status, so the two can't disagree about what a converted lead looks like.
 */
export async function convertLeadToPatient(leadId: string) {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) throw new LeadError("Leadul nu există.", 404);
  if (lead.patientId) throw new LeadError("Leadul are deja un pacient.", 409);
  if (!lead.phone) {
    throw new LeadError(
      "Adaugă un număr de telefon înainte de a crea pacientul.",
      400,
    );
  }

  const existing = await prisma.patient.findFirst({ where: { phone: lead.phone } });

  const patient =
    existing ??
    (await prisma.patient.create({
      data: {
        name: lead.name || "Pacient fără nume",
        phone: lead.phone,
        email: lead.email,
        // The first message is the closest thing to a reason for the visit,
        // so it travels with them instead of being left behind in a chat.
        notes:
          [
            lead.note,
            lead.interestedIn && `Interesat de: ${lead.interestedIn}`,
            lead.firstMessage && `Primul mesaj: ${lead.firstMessage}`,
          ]
            .filter(Boolean)
            .join("\n\n") || null,
      },
    }));

  await prisma.lead.update({
    where: { id: leadId },
    data: { patientId: patient.id, status: "convertit", followUpAt: null },
  });

  return { patient, reused: Boolean(existing) };
}

// ── Statuses set from the chat ──────────────────────────────────────────────
//
// The assistant talks to people before anyone at the clinic reads the
// conversation, so it is the first to know where a lead stands. What it may
// change is narrow on purpose: it moves leads that are still at the start of
// the pipeline, it never moves one back from a stage a person put it in, and
// it never closes one. "urgent" is the one move it may make from anywhere,
// because a patient waiting on a promised callback outranks the pipeline.

/** Which chat a turn belongs to: the sender id, or the number on WhatsApp. */
export interface ChatConversation {
  channel: "whatsapp" | "messenger" | "instagram";
  handle: string;
}

/** The statuses the assistant itself may choose. */
export const CHAT_STATUSES = ["urgent", "se_gandeste", "mai_tarziu"] as const;
export type ChatStatus = (typeof CHAT_STATUSES)[number];

const ASSISTANT = "Asistent AI";

const conversationKey = (c: ChatConversation) => `${c.channel}:${c.handle}`;

/**
 * Sets the status the assistant chose, with its reason as a note on the lead.
 *
 * A patient already in the patient list has no lead behind their WhatsApp; if
 * they need a person, one is opened as urgent so the request shows up where
 * reception looks. For the other statuses there is nothing to record.
 *
 * Never throws — a status is bookkeeping, and must not cost the reply.
 */
export async function setLeadFromChat(
  conversation: ChatConversation,
  status: ChatStatus,
  reason: string,
  known?: { name: string; phone: string } | null,
): Promise<{ ok: boolean; motiv?: string }> {
  try {
    const key = conversationKey(conversation);
    const note = `${getStatus(status).emoji} ${getStatus(status).label}: ${reason || "fără motiv"}`.slice(0, 1000);
    let lead = await prisma.lead.findUnique({ where: { sourceKey: key } });
    let becameUrgent = false;

    if (!lead) {
      if (status !== "urgent") return { ok: true };
      const phone =
        conversation.channel === "whatsapp" ? conversation.handle : (known?.phone ?? null);
      const patient = phone
        ? await prisma.patient.findFirst({ where: { phone }, select: { id: true } })
        : null;
      lead = await prisma.lead.create({
        data: {
          source: conversation.channel,
          sourceKey: key,
          name: known?.name ?? null,
          phone,
          status: "urgent",
          patientId: patient?.id ?? null,
        },
      });
      becameUrgent = true;
    } else if (status === "urgent") {
      if (lead.status === "urgent") {
        // Still waiting on the same person. Telegram already knows; a note is
        // worth adding only if there is something new to say.
        const last = await prisma.leadNote.findFirst({
          where: { leadId: lead.id },
          orderBy: { createdAt: "desc" },
          select: { content: true },
        });
        if (last?.content === note) return { ok: true };
      } else {
        lead = await prisma.lead.update({ where: { id: lead.id }, data: { status: "urgent" } });
        becameUrgent = true;
      }
    } else if (EARLY_STATUSES.includes(lead.status as never) && lead.status !== status) {
      await prisma.lead.update({
        where: { id: lead.id },
        data: { status: status as LeadStatus },
      });
    } else {
      // Already further along than the assistant can judge, or unchanged.
      return { ok: true };
    }

    await prisma.leadNote.create({
      data: { leadId: lead.id, content: note, authorName: ASSISTANT },
    });

    // Once per wait: the alert goes out when the lead becomes urgent, not again
    // for every message while it still is. A person answering clears it.
    if (becameUrgent) await notifyLead("urgent", lead, { why: reason || undefined });
    return { ok: true };
  } catch (error) {
    console.error("setLeadFromChat failed:", error);
    return { ok: false };
  }
}

/** Somebody answered a new lead: it has been contacted. */
export async function markLeadContacted(conversation: ChatConversation): Promise<void> {
  await prisma.lead
    .updateMany({
      where: { sourceKey: conversationKey(conversation), status: { in: ["nou", "fara_raspuns"] } },
      data: { status: "contactat" },
    })
    .catch((error) => console.error("markLeadContacted failed:", error));
}

/**
 * A booking moves its lead to "Programat consultație" and links it to the
 * patient — whoever made it. Called for every new appointment (the assistant's,
 * the admin form's, the Telegram bot's), so a lead does not sit on "Contactat"
 * because reception booked it by hand.
 *
 * The lead is found by conversation, and by phone: leads hold "+37368425081"
 * and patients "068425081", so the last eight digits are compared. Only leads
 * still at the start move. One flagged urgent also moves when reception made
 * the booking — that is the person it was waiting for; the assistant's own
 * booking leaves it for a human to look at. Does nothing, and writes no note,
 * when there is nothing to change — it can be called twice for one booking.
 */
export async function markLeadBooked(args: {
  conversation?: ChatConversation | null;
  phone: string;
  name: string;
  patientId: string;
  summary: string;
  /** Who made the booking. */
  by?: "chat" | "recepție";
}): Promise<void> {
  try {
    const by = args.by ?? "chat";
    // Digits only, so the value is safe inside Prisma's regex-based filters.
    const tail = args.phone.replace(/\D/g, "").slice(-8);
    const keys = args.conversation ? [conversationKey(args.conversation)] : [];
    const found = [
      ...(tail.length === 8 ? [{ phone: { contains: tail } }] : []),
      ...(keys.length ? [{ sourceKey: { in: keys } }] : []),
    ];
    if (found.length === 0) return;

    const leads = await prisma.lead.findMany({ where: { OR: found } });

    for (const lead of leads) {
      const moves =
        EARLY_STATUSES.includes(lead.status as never) ||
        (by === "recepție" && lead.status === "urgent");

      const data: Prisma.LeadUncheckedUpdateInput = {};
      if (!lead.patientId) data.patientId = args.patientId;
      // A Messenger lead rarely has a number; the booking just supplied one.
      if (!lead.phone) data.phone = args.phone;
      if (!lead.name) data.name = args.name;
      if (moves && lead.status !== "programat") {
        data.status = "programat" as LeadStatus;
        data.followUpAt = null;
      }
      if (Object.keys(data).length === 0) continue;

      await prisma.lead.update({ where: { id: lead.id }, data });
      await prisma.leadNote.create({
        data: {
          leadId: lead.id,
          content: `📅 Programat${by === "chat" ? " prin chat" : " de recepție"}: ${args.summary}`,
          authorName: by === "chat" ? ASSISTANT : "Recepție",
        },
      });
    }
  } catch (error) {
    console.error("markLeadBooked failed:", error);
  }
}

/** A person from the clinic answered: whatever was urgent is now in hand. */
export async function clearUrgent(conversation: ChatConversation): Promise<void> {
  await prisma.lead
    .updateMany({
      where: { sourceKey: conversationKey(conversation), status: "urgent" },
      data: { status: "contactat" },
    })
    .catch((error) => console.error("clearUrgent failed:", error));
}

/**
 * Reception booked a patient by hand — in the admin form or from Telegram.
 * Whatever lead that person has moves to "Programat" and is linked to them,
 * the same as when the assistant books.
 */
export async function markLeadBookedByStaff(a: {
  patientId: string;
  dateTime: Date;
  patient: { name: string; phone: string };
  service: { title: string };
}): Promise<void> {
  await markLeadBooked({
    phone: a.patient.phone,
    name: a.patient.name,
    patientId: a.patientId,
    summary: `${formatDateTimeRo(a.dateTime)}, ${a.service.title}`,
    by: "recepție",
  });
}
