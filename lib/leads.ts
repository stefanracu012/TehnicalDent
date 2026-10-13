// =============================================
// Leads — people who reached out and are not patients yet.
//
// Every inbound channel funnels through captureLead, which is deliberately
// forgiving: a lead is worth having even when all we know is that someone
// wrote. Details fill in as they arrive.
// =============================================

import prisma from "@/lib/prisma";
import type { LeadSource } from "@prisma/client";

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
 * Never throws. A failure here must not cost the message that triggered it.
 */
export async function captureLead(input: CaptureInput): Promise<void> {
  try {
    const sourceKey = `${input.source}:${input.reference}`;
    const phone =
      input.phone ?? (input.message ? extractPhone(input.message) : null);

    const existing = await prisma.lead.findUnique({ where: { sourceKey } });

    if (!existing) {
      await prisma.lead.create({
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
      return;
    }

    const patch: Record<string, string> = {};
    if (!existing.name && input.name) patch.name = input.name;
    if (!existing.phone && phone) patch.phone = phone;
    if (!existing.email && input.email) patch.email = input.email;
    if (!existing.interestedIn && input.interest) patch.interestedIn = input.interest;

    if (Object.keys(patch).length > 0) {
      await prisma.lead.update({ where: { sourceKey }, data: patch });
    }
  } catch (error) {
    console.error("captureLead failed:", error);
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
