// =============================================
// "STOP" on WhatsApp.
//
// Meta expects a marketing template to offer a way out, and offering one the
// code does not honour would be worse than not offering it at all. So the
// keyword is handled here, before anything else reads the message.
//
// Only campaigns are held back. Appointment confirmations, reminders and the
// review request still go out: those are the messages the patient came to the
// clinic for, and silencing them would mean people missing their own hour.
// =============================================

import prisma from "@/lib/prisma";

/**
 * Matched whole, not as a substring.
 *
 * "Stop" inside a sentence is usually about a toothache, not a subscription —
 * unsubscribing someone who wrote "nu pot stopa durerea" would lose the clinic
 * a patient it never heard from again.
 */
const STOP_WORDS = ["STOP", "СТОП", "DEZABONARE", "UNSUBSCRIBE", "ОТПИСАТЬСЯ"];
const START_WORDS = ["START", "СТАРТ", "ABONARE", "SUBSCRIBE"];

export type OptOutAction = "stop" | "start" | null;

/** Which keyword the message is, if it is one at all. */
export function optOutKeyword(text: string): OptOutAction {
  // Trailing punctuation and case are not the patient's problem.
  const word = text
    .trim()
    .replace(/[.!?,;:]+$/u, "")
    .toUpperCase();
  if (STOP_WORDS.includes(word)) return "stop";
  if (START_WORDS.includes(word)) return "start";
  return null;
}

/**
 * Records the choice and returns what to write back, or null when the message
 * was not a keyword at all and the rest of the pipeline should carry on.
 *
 * A phone with no patient row is still honoured: the number is what campaigns
 * are addressed to, so it is what has to be remembered. Nothing is created for
 * a stranger — there is nothing to hold back from them yet.
 */
export async function handleOptOut(
  phone: string,
  text: string,
): Promise<string | null> {
  const action = optOutKeyword(text);
  if (!action) return null;

  const patient = await prisma.patient.findFirst({
    where: { phone },
    select: { id: true },
  });

  if (action === "stop") {
    if (patient) {
      await prisma.patient.update({
        where: { id: patient.id },
        data: { marketingOptOutAt: new Date() },
      });
    }
    return (
      "Am notat. Nu vă mai trimitem oferte.\n\n" +
      "Mesajele despre programările dumneavoastră le veți primi în continuare. " +
      "Dacă vă răzgândiți, scrieți START."
    );
  }

  if (patient) {
    await prisma.patient.update({
      where: { id: patient.id },
      data: { marketingOptOutAt: null },
    });
  }
  return "Gata, veți primi din nou ofertele noastre.";
}
