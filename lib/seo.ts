/**
 * Shared SEO helpers for generating hreflang alternates and canonical URLs.
 */

const BASE_URL = "https://tehnicaldent.com";
const LOCALES = ["ro", "en", "ru", "it"];

/**
 * Generates hreflang alternates + canonical for a given path.
 * @param path - The path WITHOUT locale prefix, e.g. "/servicii" or "/servicii/implant-dentar"
 * @param currentLocale - The current locale
 */
export function getAlternates(path: string, currentLocale: string) {
  const languages: Record<string, string> = {};
  for (const locale of LOCALES) {
    languages[locale] = `${BASE_URL}/${locale}${path}`;
  }
  languages["x-default"] = `${BASE_URL}/ro${path}`;

  return {
    canonical: `${BASE_URL}/${currentLocale}${path}`,
    languages,
  };
}

/**
 * Maps locale code to OpenGraph locale string.
 */
export function getOgLocale(locale: string): string {
  const map: Record<string, string> = {
    ro: "ro_RO",
    en: "en_US",
    ru: "ru_RU",
    it: "it_IT",
  };
  return map[locale] || "ro_RO";
}

/**
 * Base dental keywords per locale — always appended to page-specific keywords.
 */
const BASE_KEYWORDS: Record<string, string[]> = {
  ro: ["clinică stomatologică", "dentist", "stomatolog", "TechnicalDent", "Chișinău", "tratament dentar"],
  en: ["dental clinic", "dentist", "TechnicalDent", "Chisinau", "dental treatment"],
  ru: ["стоматологическая клиника", "стоматолог", "TechnicalDent", "Кишинёв", "лечение зубов"],
  it: ["clinica odontoiatrica", "dentista", "TechnicalDent", "Chisinau", "trattamento dentale"],
};

/**
 * Generates a combined keywords string for a page, merging page-specific and base dental keywords.
 * @param pageKeywords - Array of page-specific keywords (e.g. service title, category, tags)
 * @param locale - Current locale
 */
export function getKeywords(pageKeywords: string[], locale: string): string {
  const base = BASE_KEYWORDS[locale] || BASE_KEYWORDS.ro;
  const all = [...pageKeywords, ...base];
  // Deduplicate (case-insensitive)
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const kw of all) {
    const lower = kw.toLowerCase().trim();
    if (lower && !seen.has(lower)) {
      seen.add(lower);
      unique.push(kw.trim());
    }
  }
  return unique.join(", ");
}

export { BASE_URL, LOCALES };
