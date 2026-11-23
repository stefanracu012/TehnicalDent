// Which services an article is about, and which articles a service has.
//
// Articles and services did not link to each other: an article on gum disease
// never pointed to the periodontology page, and that page never pointed to the
// articles written about it — the links that tell a reader (and a search
// engine) what belongs together. With eight services a plain keyword rule is
// more dependable than a clever match that could tie an article to the wrong
// treatment, and it can be read and changed here.
//
// Matched on the Romanian title, tags and category — the original text — so a
// translated article is tied to the same services as its source.

/** service slug → words that, in an article's title or tags, mean it is about that service. */
const RULES: Record<string, string[]> = {
  "promotie-de-toamna-la-igienizarea-dentara": [
    "igieniz", "periaj", "ata dentara", "apa de gura", "tartru", "respiratia urat",
  ],
  "estetica-dentara": ["albire", "albirea", "zambet alb", "estetic"],
  endodontie: ["nerv", "canal"],
  terapie: ["carie", "carii"],
  parodontologie: ["gingi"],
  pedodontie: ["copii", "pedodont"],
  "protetica-dentara": ["proteze", "proteza", "protetic"],
  // The consultation page (its address is still /implantologie) is where
  // everything with no treatment page of its own leads.
  implantologie: ["implant", "bruxism", "radiograf", "ortodont", "muscatur", "semne ca"],
};

/** Articles about the clinic itself, not about one treatment — linked to none. */
const NOT_ABOUT_A_SERVICE = new Set(["de-ce-sa-alegi-tehnical-dent", "rezultate"]);

const normalise = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** The services an article is about, best first, at most `max`. */
export function servicesForPost(
  post: { slug?: string; title: string; tags?: string[] },
  availableSlugs: string[],
  max = 2,
): string[] {
  if (post.slug && NOT_ABOUT_A_SERVICE.has(post.slug)) return [];
  const text = normalise([post.title, ...(post.tags ?? [])].join(" "));
  const scored = availableSlugs
    .map((slug) => ({
      slug,
      hits: (RULES[slug] ?? []).filter((word) => text.includes(word)).length,
    }))
    .filter((s) => s.hits > 0)
    .sort((a, b) => b.hits - a.hits);
  return scored.slice(0, max).map((s) => s.slug);
}

/** The articles about a service, newest first as given, at most `max`. */
export function postsForService<T extends { slug: string; title: string; tags?: string[] }>(
  serviceSlug: string,
  posts: T[],
  allServiceSlugs: string[],
  max = 3,
): T[] {
  return posts
    .filter((p) => servicesForPost(p, allServiceSlugs).includes(serviceSlug))
    // (p carries its slug, so the exclusions above apply here too)
    .slice(0, max);
}
