// Localization helper for multi-language content from DB
// Main fields store Romanian (default). translations Json stores en/ru/it.

export type TranslationsMap = Record<string, Record<string, unknown>>;

export const LOCALES = ["ro", "en", "ru", "it"] as const;
export type Locale = (typeof LOCALES)[number];

export const LOCALE_LABELS: { code: string; flag: string; name: string }[] = [
  { code: "ro", flag: "🇷🇴", name: "Română" },
  { code: "en", flag: "🇬🇧", name: "English" },
  { code: "ru", flag: "🇷🇺", name: "Русский" },
  { code: "it", flag: "🇮🇹", name: "Italiano" },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyEntity = any;

/**
 * Get a single localized string field from an entity.
 * Falls back to the Romanian (main) field if translation is missing.
 */
export function getLocalizedField(
  entity: AnyEntity,
  field: string,
  locale: string,
): string {
  if (locale === "ro") return (entity[field] as string) || "";
  const val = entity.translations?.[locale]?.[field];
  if (typeof val === "string" && val.length > 0) return val;
  return (entity[field] as string) || "";
}

/**
 * Get a localized array field (e.g. benefits).
 * Falls back to the Romanian (main) field if translation is missing.
 */
export function getLocalizedArrayField(
  entity: AnyEntity,
  field: string,
  locale: string,
): string[] {
  if (locale === "ro") return (entity[field] as string[]) || [];
  const val = entity.translations?.[locale]?.[field];
  if (Array.isArray(val) && val.length > 0) return val as string[];
  return (entity[field] as string[]) || [];
}

/**
 * Localize a full service entity for public display.
 */
export function localizeService<T>(entity: T, locale: string): T {
  if (locale === "ro") return entity;
  const e = entity as AnyEntity;
  return {
    ...entity,
    title: getLocalizedField(e, "title", locale),
    shortDesc: getLocalizedField(e, "shortDesc", locale),
    description: getLocalizedField(e, "description", locale),
    overview: getLocalizedField(e, "overview", locale),
    process: getLocalizedField(e, "process", locale),
    recovery: getLocalizedField(e, "recovery", locale),
    benefits: getLocalizedArrayField(e, "benefits", locale),
    category: getLocalizedField(e, "category", locale),
  };
}

/**
 * Localize a team member entity for public display.
 */
export function localizeTeamMember<T>(entity: T, locale: string): T {
  if (locale === "ro") return entity;
  const e = entity as AnyEntity;
  return {
    ...entity,
    role: getLocalizedField(e, "role", locale),
    description: getLocalizedField(e, "description", locale),
  };
}

/**
 * Localize a testimonial entity for public display.
 */
export function localizeTestimonial<T>(entity: T, locale: string): T {
  if (locale === "ro") return entity;
  const e = entity as AnyEntity;
  return {
    ...entity,
    content: getLocalizedField(e, "content", locale),
    service: getLocalizedField(e, "service", locale) || null,
  };
}

/**
 * Localize a gallery image entity for public display.
 */
export function localizeGalleryImage<T>(entity: T, locale: string): T {
  if (locale === "ro") return entity;
  const e = entity as AnyEntity;
  return {
    ...entity,
    alt: getLocalizedField(e, "alt", locale),
    category: getLocalizedField(e, "category", locale),
  };
}

/**
 * Localize a blog post entity for public display.
 */
export function localizeBlogPost<T>(entity: T, locale: string): T {
  if (locale === "ro") return entity;
  const e = entity as AnyEntity;
  return {
    ...entity,
    title: getLocalizedField(e, "title", locale),
    excerpt: getLocalizedField(e, "excerpt", locale),
    content: getLocalizedField(e, "content", locale),
  };
}
