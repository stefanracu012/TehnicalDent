// =============================================
// Text typed into a search box, made safe for Prisma's string filters.
//
// On MongoDB, Prisma sends `contains`, `startsWith` and `endsWith` to the
// database as a regular expression without escaping it. Anything a person
// types is therefore read as a pattern: "+373" (how every stored phone
// starts) matched nothing, "(069" failed the whole request, and a "|" turned
// a prefix into "or". Every search on user input goes through literal().
// =============================================

/** The text, with every regular-expression character escaped. */
export function literal(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
