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

export { BASE_URL, LOCALES };
