// =============================================
// WhatsApp message templates, exactly as submitted to Meta.
//
// Kept dependency-free on purpose: the app reads it to build the message and
// the preview, and the submission script reads the same constant to send it
// for review. A template whose text drifts from what Meta approved does not
// fail when you edit it — it fails months later, at send time, for a patient.
// =============================================

export const SEASONAL_OFFER_TEMPLATE = {
  name: "oferta_sezon",
  language: "ro",
  category: "MARKETING",
  // {{1}} nume, {{2}} sezon, {{3}} serviciu, {{4}} reducere
  body: `Bună ziua, {{1}}!
Avem o ofertă specială la clinica Tehnical Dent:
Promoție de {{2}} la {{3}}, cu reducere de {{4}}.

Doriți să vă programăm?

Răspundeți la acest mesaj sau sunați-ne:
📞 060 355 350

O zi frumoasă! 🦷`,
  // Meta looks for a way out on marketing templates, and the webhook honours
  // this one: STOP stops campaigns, appointment messages carry on.
  footer: "Scrieți STOP dacă nu doriți să primiți oferte.",
  // Meta requires a filled-in example for every variable, and judges the
  // template on it — so these are real values, not placeholders.
  example: ["Mihaela", "TOAMNĂ", "igienizarea dentară", "-10%"],
} as const;

/** Fills the approved body in, for the admin preview and the email version. */
export function seasonalOfferText(
  name: string,
  season: string,
  service: string,
  discount: string,
): string {
  return SEASONAL_OFFER_TEMPLATE.body
    .replace("{{1}}", name)
    .replace("{{2}}", season)
    .replace("{{3}}", service)
    .replace("{{4}}", discount);
}
