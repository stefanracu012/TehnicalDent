import type { MetadataRoute } from "next";
import { getServices } from "@/lib/data";
import { getAllPublishedSlugs } from "@/lib/blog-data";

const BASE_URL = "https://tehnicaldent.com";
const LOCALES = ["ro", "en", "ru", "it"];

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
    const alternates: Record<string, string> = {};
    for (const locale of LOCALES) {
      alternates[locale] = `${BASE_URL}/${locale}${page}`;
    }

    entries.push({
      url: `${BASE_URL}/ro${page}`,
      lastModified: new Date(),
      changeFrequency: page === "" ? "weekly" : "monthly",
      priority: page === "" ? 1 : 0.8,
      alternates: { languages: alternates },
    });
  }

  // Service pages
  for (const service of services) {
    if (!service.isActive) continue;
    const alternates: Record<string, string> = {};
    for (const locale of LOCALES) {
      alternates[locale] = `${BASE_URL}/${locale}/servicii/${service.slug}`;
    }
    entries.push({
      url: `${BASE_URL}/ro/servicii/${service.slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.9,
      alternates: { languages: alternates },
    });
  }

  // Blog pages
  for (const slug of blogSlugs) {
    const alternates: Record<string, string> = {};
    for (const locale of LOCALES) {
      alternates[locale] = `${BASE_URL}/${locale}/recomandari/${slug}`;
    }
    entries.push({
      url: `${BASE_URL}/ro/recomandari/${slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
      alternates: { languages: alternates },
    });
  }

  return entries;
}
