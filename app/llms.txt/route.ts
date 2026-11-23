import { getServices } from "@/lib/data";
import { getPublishedBlogPosts } from "@/lib/blog-data";
import { CLINIC } from "@/lib/seo";

// Built once, with the rest of the site, and rebuilt when services or articles
// are saved in the admin.
export const dynamic = "force-static";

/**
 * /llms.txt — a plain summary of the clinic for AI assistants and search
 * engines that answer questions in their own words: who we are, where, when,
 * and which pages say what. Only facts the site itself states.
 */
export async function GET() {
  const base = "https://www.tehnicaldent.com";
  const services = (await getServices()).filter((s) => s.isActive);
  const posts = await getPublishedBlogPosts("ro");

  const lines = [
    "# TehnicalDent",
    "",
    "> TehnicalDent (also written Tehnical Dent) is a dental clinic in Chișinău, Republic of Moldova, in the Botanica district. The site is in Romanian, Russian, English and Italian.",
    "",
    "## Contact",
    `- Address: ${CLINIC.streetAddress}, ${CLINIC.locality} (sector ${CLINIC.district}), Moldova`,
    `- Phone, WhatsApp and Viber: ${CLINIC.telephoneDisplay}`,
    `- Email: ${CLINIC.email}`,
    "- Opening hours: Monday–Friday 09:00–18:00. Closed Saturday and Sunday, though the clinic sometimes works on Saturdays.",
    `- Online booking: ${base}/ro/contact (choose a service, a doctor and a free time from the doctors' calendars)`,
    `- Map: ${CLINIC.mapsUrl}`,
    "",
    "## Services",
    ...services.map((s) => `- [${s.title}](${base}/ro/servicii/${s.slug}): ${s.shortDesc}`),
    "",
    "## Main pages",
    `- [Services](${base}/ro/servicii)`,
    `- [About the clinic and the team](${base}/ro/despre)`,
    `- [Contact and booking](${base}/ro/contact)`,
    `- [Advice articles](${base}/ro/recomandari)`,
    "",
    "## Articles",
    ...posts.map((p) => `- [${p.title}](${base}/ro/recomandari/${p.slug}): ${p.excerpt.replace(/\s+/g, " ").slice(0, 160)}`),
    "",
  ];

  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
