/**
 * Shared SEO helpers for generating hreflang alternates and canonical URLs.
 */

const BASE_URL = "https://tehnicaldent.com";
const LOCALES = ["ro", "en", "ru", "it"];

/**
 * Canonical NAP (name / address / phone) for the clinic. These values must stay
 * byte-identical to the Google Business Profile listing — local search resolves
 * the business entity by matching them.
 */
const CLINIC = {
  name: "TehnicalDent",
  streetAddress: "Str. Sarmizegetusa 24/1",
  locality: "Chișinău",
  district: "Botanica",
  postalCode: "MD-2032",
  country: "MD",
  telephone: "+37379950008",
  email: "tehnicaldentmd@gmail.com",
  // Marker coordinates of the Google Maps listing, not the city centroid.
  latitude: 46.9856776,
  longitude: 28.8743392,
  // Google Business Profile, addressed by CID so the link survives renames.
  mapsUrl: "https://maps.google.com/?cid=9898837772824425436",
} as const;

/**
 * Generates hreflang alternates + canonical for a given path.
 * @param path - The path WITHOUT locale prefix, e.g. "/servicii" or "/servicii/implant-dentar"
 * @param currentLocale - The current locale
 */
/**
 * hreflang tag emitted for each locale. The Romanian and Russian versions are
 * territory-tagged to Moldova because that is the only market the clinic serves;
 * everyone else still reaches /ro through x-default.
 */
export const HREFLANG: Record<string, string> = {
  ro: "ro-MD",
  ru: "ru-MD",
  en: "en",
  it: "it",
};

export function getAlternates(path: string, currentLocale: string) {
  const languages: Record<string, string> = {};
  for (const locale of LOCALES) {
    languages[HREFLANG[locale] ?? locale] = `${BASE_URL}/${locale}${path}`;
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
  // Romanian and Russian are both territory-tagged to Moldova: the clinic serves
  // Chișinău only, and a same-named company in Romania already competes for the
  // brand term.
  const map: Record<string, string> = {
    ro: "ro_MD",
    en: "en_US",
    ru: "ru_MD",
    it: "it_IT",
  };
  return map[locale] || "ro_MD";
}

/**
 * Base dental keywords per locale — always appended to page-specific keywords.
 */
const BASE_KEYWORDS: Record<string, string[]> = {
  ro: ["clinică stomatologică Chișinău", "stomatologie Chișinău", "dentist Chișinău", "stomatolog Botanica", "TehnicalDent", "tratament dentar"],
  en: ["dental clinic Chisinau", "dentist Chisinau", "TehnicalDent", "Botanica", "dental treatment"],
  ru: ["стоматология Кишинёв", "стоматолог Кишинёв", "стоматологическая клиника Ботаника", "TehnicalDent", "лечение зубов"],
  it: ["clinica odontoiatrica Chisinau", "dentista Chisinau", "TehnicalDent", "trattamento dentale"],
};

/**
 * Where the clinic is, phrased for the tail of a meta description. Service copy
 * comes from the database and carries no location of its own, so every service
 * page would otherwise compete on the bare procedure name.
 */
const LOCAL_SUFFIX: Record<string, string> = {
  ro: "Clinică stomatologică în Chișinău, sectorul Botanica.",
  en: "Dental clinic in Chisinau, Botanica district.",
  ru: "Стоматологическая клиника в Кишинёве, сектор Ботаника.",
  it: "Clinica odontoiatrica a Chisinau, settore Botanica.",
};

/**
 * Appends the clinic's location to a description, trimming the base text so the
 * result stays inside the ~160 characters Google renders in a snippet.
 */
export function withLocation(description: string, locale: string): string {
  const suffix = LOCAL_SUFFIX[locale] || LOCAL_SUFFIX.ro;
  const budget = 160 - suffix.length - 1;
  const base = description.trim();
  if (base.length <= budget) return `${base} ${suffix}`;
  const cut = base.slice(0, budget - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trimEnd()}… ${suffix}`;
}

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

export { BASE_URL, LOCALES, CLINIC };
