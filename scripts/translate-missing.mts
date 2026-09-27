// =============================================
// Fills in en/ru/it translations wherever they are missing, for everything
// the public site can show in another language: services, team members,
// blog posts (including their sections), testimonials, gallery captions.
//
// Uses the same Google Translate endpoint as the admin "Traduce automat"
// button — this just runs it for every record instead of one at a time by
// hand. Never overwrites a translation that already exists for a field: a
// post with an English title but no English excerpt gets the excerpt filled
// in, the title left alone.
//
//   npm run translate-missing -- --dry     shows what would change
//   npm run translate-missing              writes it
// =============================================

import fs from "node:fs";

const NL = String.fromCharCode(10);
function loadEnv(file: string) {
  if (!fs.existsSync(file)) return;
  for (const raw of fs.readFileSync(file, "utf8").split(NL)) {
    const line = raw.trim();
    const i = line.indexOf("=");
    if (i > 0 && !line.startsWith("#")) {
      let v = line.slice(i + 1).trim();
      const q = v.slice(0, 1);
      if ((q === '"' || q === "'") && v.endsWith(q)) v = v.slice(1, -1);
      if (!process.env[line.slice(0, i)]) process.env[line.slice(0, i)] = v;
    }
  }
}
loadEnv(".env.local");

const dry = process.argv.includes("--dry");
const TARGET_LOCALES = ["en", "ru", "it"] as const;
type Locale = (typeof TARGET_LOCALES)[number];

const { default: prisma } = await import("../lib/prisma.js");

// ---- Translation engine (same free endpoint the admin button uses) --------

async function translateChunk(text: string, targetLang: string): Promise<string> {
  if (!text.trim()) return "";
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=ro&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any = await res.json();
      if (!data?.[0]) return text;
      let translated = data[0]
        .filter((s: unknown[]) => s?.[0])
        .map((s: unknown[]) => s[0])
        .join("");
      if (
        translated === translated.toUpperCase() &&
        text !== text.toUpperCase() &&
        translated.length < 50
      ) {
        translated = translated.charAt(0).toUpperCase() + translated.slice(1).toLowerCase();
      }
      return translated;
    } catch (error) {
      if (attempt === 2) throw error;
      await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
    }
  }
  return text;
}

async function translateText(text: string, targetLang: string): Promise<string> {
  if (!text.trim()) return "";
  if (text.length <= 3000) return translateChunk(text, targetLang);

  const paragraphs = text.split("\n");
  const chunks: string[] = [];
  let current = "";
  for (const para of paragraphs) {
    if ((current + "\n" + para).length > 3000 && current) {
      chunks.push(current);
      current = para;
    } else {
      current = current ? current + "\n" + para : para;
    }
  }
  if (current) chunks.push(current);

  const results: string[] = [];
  for (const chunk of chunks) results.push(await translateChunk(chunk, targetLang));
  return results.join("\n");
}

// ---- Shared helpers ---------------------------------------------------------

type Translations = Record<string, Record<string, unknown>>;

/** Only the string/array fields that do not already have a value for this locale. */
function missingFields(
  translations: Translations | null | undefined,
  locale: Locale,
  source: Record<string, unknown>,
): Record<string, unknown> {
  const existing = translations?.[locale] ?? {};
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(source)) {
    if (existing[key] !== undefined && existing[key] !== "") continue;
    if (typeof value === "string" && value.trim()) out[key] = value;
    else if (Array.isArray(value) && value.length) out[key] = value;
  }
  return out;
}

async function translateFields(
  fields: Record<string, unknown>,
  locale: Locale,
): Promise<Record<string, unknown>> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (typeof value === "string") {
      out[key] = await translateText(value, locale);
    } else if (Array.isArray(value)) {
      const items: string[] = [];
      for (const item of value) {
        items.push(typeof item === "string" ? await translateText(item, locale) : "");
      }
      out[key] = items;
    }
  }
  return out;
}

let totalFieldsTranslated = 0;
let totalRecordsTouched = 0;

async function processRecord(
  label: string,
  translations: Translations | null,
  source: Record<string, unknown>,
  save: (next: Translations) => Promise<unknown>,
) {
  const next: Translations = { ...(translations ?? {}) };
  let touched = false;

  for (const locale of TARGET_LOCALES) {
    const missing = missingFields(translations, locale, source);
    const keys = Object.keys(missing);
    if (keys.length === 0) continue;

    console.log(`   ${label} [${locale}]: ${keys.join(", ")}`);
    totalFieldsTranslated += keys.length;
    touched = true;

    if (!dry) {
      const translated = await translateFields(missing, locale);
      next[locale] = { ...(next[locale] ?? {}), ...translated };
    }
  }

  if (touched) {
    totalRecordsTouched++;
    if (!dry) await save(next);
  }
}

// ---- Services ---------------------------------------------------------------

async function services() {
  // showOnSite was added after these documents were written, so it is absent
  // rather than true on them — a query filter of `showOnSite: true` matches
  // none of them in MongoDB. Filtered in memory instead, same as lib/data.ts.
  const all = await prisma.service.findMany({
    where: { isActive: true },
    select: {
      showOnSite: true,
      id: true,
      slug: true,
      title: true,
      shortDesc: true,
      description: true,
      overview: true,
      process: true,
      recovery: true,
      benefits: true,
      category: true,
      translations: true,
    },
  });
  const rows = all.filter((s) => s.showOnSite !== false);
  console.log(`${NL}== Servicii (${rows.length}) ==`);
  for (const row of rows) {
    await processRecord(
      row.slug,
      row.translations as Translations | null,
      {
        title: row.title,
        shortDesc: row.shortDesc,
        description: row.description,
        overview: row.overview,
        process: row.process,
        recovery: row.recovery,
        benefits: row.benefits,
        category: row.category,
      },
      (next) => prisma.service.update({ where: { id: row.id }, data: { translations: next as any } }),
    );
  }
}

// ---- Team members -----------------------------------------------------------

async function teamMembers() {
  const rows = await prisma.teamMember.findMany({
    where: { isActive: true },
    select: { id: true, name: true, role: true, description: true, translations: true },
  });
  console.log(`${NL}== Echipă (${rows.length}) ==`);
  for (const row of rows) {
    await processRecord(
      row.name,
      row.translations as Translations | null,
      { role: row.role, description: row.description },
      (next) => prisma.teamMember.update({ where: { id: row.id }, data: { translations: next as any } }),
    );
  }
}

// ---- Testimonials -------------------------------------------------------------

async function testimonials() {
  const rows = await prisma.testimonial.findMany({
    where: { isActive: true },
    select: { id: true, name: true, content: true, service: true, translations: true },
  });
  console.log(`${NL}== Testimoniale (${rows.length}) ==`);
  for (const row of rows) {
    await processRecord(
      row.name,
      row.translations as Translations | null,
      { content: row.content, ...(row.service ? { service: row.service } : {}) },
      (next) => prisma.testimonial.update({ where: { id: row.id }, data: { translations: next as any } }),
    );
  }
}

// ---- Gallery ------------------------------------------------------------------

async function gallery() {
  const rows = await prisma.galleryImage.findMany({
    where: { isActive: true },
    select: { id: true, alt: true, category: true, translations: true },
  });
  console.log(`${NL}== Galerie (${rows.length}) ==`);
  for (const row of rows) {
    await processRecord(
      row.alt.slice(0, 40),
      row.translations as Translations | null,
      { alt: row.alt, category: row.category },
      (next) => prisma.galleryImage.update({ where: { id: row.id }, data: { translations: next as any } }),
    );
  }
}

// ---- Blog posts, including their sections --------------------------------------

interface BlogSection {
  id: string;
  title?: string;
  text?: string;
}

async function blogPosts() {
  const rows = await prisma.blogPost.findMany({
    where: { isPublished: true },
    select: {
      id: true,
      slug: true,
      title: true,
      excerpt: true,
      content: true,
      sections: true,
      translations: true,
    },
  });
  console.log(`${NL}== Articole (${rows.length}) ==`);
  for (const row of rows) {
    const sections = (row.sections as BlogSection[] | null) ?? [];
    const sectionFields: Record<string, string> = {};
    sections.forEach((s, i) => {
      if (s.title?.trim()) sectionFields[`section_${i}_title`] = s.title;
      if (s.text?.trim()) sectionFields[`section_${i}_text`] = s.text;
    });

    await processRecord(
      row.slug,
      row.translations as Translations | null,
      {
        title: row.title,
        excerpt: row.excerpt,
        content: row.content,
        ...sectionFields,
      },
      (next) => prisma.blogPost.update({ where: { id: row.id }, data: { translations: next as any } }),
    );
  }
}

await services();
await teamMembers();
await testimonials();
await gallery();
await blogPosts();

console.log(`${NL}înregistrări cu traduceri de completat: ${totalRecordsTouched}`);
console.log(`câmpuri traduse: ${totalFieldsTranslated}`);
if (dry) {
  console.log(`${NL}Rulare de probă — nu s-a scris nimic. Fără --dry se aplică.`);
}

process.exit(0);
