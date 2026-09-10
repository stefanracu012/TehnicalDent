// =============================================
// Loads the clinic's price list into the services table, hidden from the site.
//
//   npm run seed-price-list -- --dry    arată ce s-ar schimba, fără să scrie
//   npm run seed-price-list             scrie
//
// Only the rows in lib/price-list.ts are touched, and only their price fields.
// Nothing is deleted, and the eight services that have website pages are left
// alone — they carry a different slug and are not in this list.
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

const { default: prisma } = await import("../lib/prisma.js");
const { PRICE_LIST } = await import("../lib/price-list.js");

let created = 0;
let updated = 0;
let unchanged = 0;

for (const [index, item] of PRICE_LIST.entries()) {
  const existing = await prisma.service.findUnique({ where: { slug: item.slug } });

  const shape = {
    title: item.title,
    category: item.category,
    price: item.price,
    priceNote: item.priceNote ?? null,
    // Not a page and not an appointment: a line in the price list. The
    // assistant reads it for the number; nothing else should surface it.
    showOnSite: false,
    bookable: false,
    isActive: true,
    order: 1000 + index,
  };

  if (!existing) {
    console.log(`+ ${item.title} — ${item.priceNote ?? item.price + " lei"}`);
    created++;
    if (!dry) {
      await prisma.service.create({
        data: {
          slug: item.slug,
          ...shape,
          // Required by the model, and never shown anywhere for these rows.
          shortDesc: item.title,
          description: item.title,
          overview: "",
          process: "",
          recovery: "",
          benefits: [],
          images: [],
        },
      });
    }
    continue;
  }

  const differs =
    existing.title !== shape.title ||
    existing.price !== shape.price ||
    existing.priceNote !== shape.priceNote ||
    existing.showOnSite !== shape.showOnSite;

  if (!differs) {
    unchanged++;
    continue;
  }

  console.log(
    `~ ${item.title}: ${existing.price} -> ${item.priceNote ?? item.price + " lei"}`,
  );
  updated++;
  if (!dry) {
    await prisma.service.update({ where: { slug: item.slug }, data: shape });
  }
}

const onSite = (
  await prisma.service.findMany({
    where: { isActive: true },
    select: { showOnSite: true },
  })
).filter((s) => s.showOnSite !== false).length;

console.log("");
console.log(`${dry ? "S-ar crea" : "Create"}: ${created}`);
console.log(`${dry ? "S-ar actualiza" : "Actualizate"}: ${updated}`);
console.log(`Neschimbate: ${unchanged}`);
console.log(`Servicii rămase pe site: ${onSite}`);
if (dry) {
  console.log("");
  console.log("Rulare de probă — nu s-a scris nimic. Fără --dry se aplică.");
}

process.exit(0);
