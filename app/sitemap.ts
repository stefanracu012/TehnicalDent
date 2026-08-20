import type { MetadataRoute } from "next";
import { getServices } from "@/lib/data";
import { getAllPublishedSlugs } from "@/lib/blog-data";
import { BASE_URL, LOCALES, HREFLANG } from "@/lib/seo";

/**
 * Language map for one path, keyed by the same hreflang codes the pages emit in
 * their <link rel="alternate"> tags — the two must agree or Google discards both.
 */
function languagesFor(path: string): Record<string, string> {
  const languages: Record<string, string> = {};
  for (const locale of LOCALES) {
    languages[HREFLANG[locale] ?? locale] = `${BASE_URL}/${locale}${path}`;
  }
  languages["x-default"] = `${BASE_URL}/ro${path}`;
  return languages;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const services = await getServices();
  const blogSlugs = await getAllPublishedSlugs();

  const staticPages = [
    "",
    "/servicii",
    "/despre",
    "/galerie",
    "/contact",
    "/recomandari",
    "/termeni",
    "/politica-confidentialitate",
  ];

  const entries: MetadataRoute.Sitemap = [];

  // Static pages — all locales
  for (const page of staticPages) {
    entries.push({
      url: `${BASE_URL}/ro${page}`,
      lastModified: new Date(),
      changeFrequency: page === "" ? "weekly" : "monthly",
      priority: page === "" ? 1 : 0.8,
      alternates: { languages: languagesFor(page) },
    });
  }

  // Service pages
  for (const service of services) {
    if (!service.isActive) continue;
    entries.push({
      url: `${BASE_URL}/ro/servicii/${service.slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.9,
      alternates: { languages: languagesFor(`/servicii/${service.slug}`) },
    });
  }

  // Blog pages
  for (const slug of blogSlugs) {
    entries.push({
      url: `${BASE_URL}/ro/recomandari/${slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
      alternates: { languages: languagesFor(`/recomandari/${slug}`) },
    });
  }

  return entries;
}
