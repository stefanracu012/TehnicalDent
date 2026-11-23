import type { MetadataRoute } from "next";
import { getServices } from "@/lib/data";
import { getPublishedPostsForSitemap } from "@/lib/blog-data";
import { BASE_URL, LOCALES, HREFLANG } from "@/lib/seo";

/**
 * Language map for one path, keyed by the same hreflang codes the pages emit in
 * their <link rel="alternate"> tags — the two must agree or Google discards both.
 * `available` limits it to the languages the page really exists in.
 */
function languagesFor(path: string, available: string[] = LOCALES): Record<string, string> {
  const languages: Record<string, string> = {};
  for (const locale of LOCALES) {
    if (!available.includes(locale)) continue;
    languages[HREFLANG[locale] ?? locale] = `${BASE_URL}/${locale}${path}`;
  }
  languages["x-default"] = `${BASE_URL}/ro${path}`;
  return languages;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const services = (await getServices()).filter((s) => s.isActive);
  const posts = await getPublishedPostsForSitemap();

  // Every language version is its own entry, each listing all the versions —
  // Google wants the set to be complete and the same from every side.
  //
  // lastModified is the day the content really changed. It used to be "now" on
  // every entry, which teaches Google to ignore the field altogether. Pages with
  // no date of their own (the static ones) leave it out rather than invent one.
  const entries: MetadataRoute.Sitemap = [];
  const push = (
    path: string,
    available: string[],
    extra: { lastModified?: Date; changeFrequency: "weekly" | "monthly"; priority: number; images?: string[] },
  ) => {
    for (const locale of available) {
      entries.push({
        url: `${BASE_URL}/${locale}${path}`,
        ...extra,
        alternates: { languages: languagesFor(path, available) },
      });
    }
  };

  // Absolute address of an image, for image search.
  const abs = (src?: string | null) => (src ? (src.startsWith("http") ? src : `${BASE_URL}${src}`) : undefined);

  const newest = (dates: (Date | undefined)[]) =>
    dates.filter((d): d is Date => d instanceof Date).sort((a, b) => b.getTime() - a.getTime())[0];

  const serviceDates = services.map((s) => (s as { updatedAt?: Date }).updatedAt);
  const postDates = posts.map((p) => p.updatedAt);

  // The home page and the lists change when what they list changes.
  push("", LOCALES, { lastModified: newest([...serviceDates, ...postDates]), changeFrequency: "weekly", priority: 1 });
  push("/servicii", LOCALES, { lastModified: newest(serviceDates), changeFrequency: "monthly", priority: 0.8 });
  push("/recomandari", LOCALES, { lastModified: newest(postDates), changeFrequency: "weekly", priority: 0.8 });
  for (const page of ["/despre", "/galerie", "/contact", "/termeni", "/politica-confidentialitate"]) {
    push(page, LOCALES, { changeFrequency: "monthly", priority: 0.8 });
  }

  for (const service of services) {
    push(`/servicii/${service.slug}`, LOCALES, {
      lastModified: (service as { updatedAt?: Date }).updatedAt,
      changeFrequency: "monthly",
      priority: 0.9,
      ...(abs((service.images as string[] | undefined)?.[0]) ? { images: [abs((service.images as string[])[0])!] } : {}),
    });
  }

  // Only the languages an article exists in: one with no translation is not
  // listed under /en, /ru or /it, where it would be the Romanian text again.
  for (const post of posts) {
    push(`/recomandari/${post.slug}`, post.locales, {
      lastModified: post.updatedAt,
      changeFrequency: "weekly",
      priority: 0.7,
      ...(abs(post.image) ? { images: [abs(post.image)!] } : {}),
    });
  }

  return entries;
}
