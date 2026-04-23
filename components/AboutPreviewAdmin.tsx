"use client";

import Image from "next/image";
import Link from "next/link";

// Hardcoded Romanian defaults — matches messages/ro.json "AboutPreview"
const DEFAULTS = {
  image: "/images/about-clinic.jpg",
  years: "2+",
  badge: "Ani de experiență în stomatologie",
  subtitle: "Despre noi",
  title: "O clinică dedicată sănătății și frumuseții zâmbetului dumneavoastră",
  p1: "TechnicalDent este mai mult decât o clinică stomatologică – este un loc unde tehnologia avansată întâlnește grija autentică pentru pacient. Cu o echipă de specialiști dedicați și echipamente de ultimă generație, oferim tratamente personalizate pentru fiecare nevoie.",
  p2: "Echipa noastră de medici specialiști aduce împreună decenii de experiență și o pasiune comună pentru excelență. De la consultații detaliate la proceduri complexe, fiecare pas este ghidat de angajamentul nostru față de rezultatele perfecte.",
  stat1Value: "Modern",
  stat1Label: "Echipamente de ultimă generație",
  stat2Value: "Complet",
  stat2Label: "Toate specialitățile sub un acoperiș",
  stat3Value: "Personal",
  stat3Label: "Plan de tratament individualizat",
  link: "Află mai multe despre noi",
};

export interface AboutPreviewAdminProps {
  image?: string;
  years?: string;
  badge?: string;
  subtitle?: string;
  title?: string;
  p1?: string;
  p2?: string;
  stat1Value?: string;
  stat1Label?: string;
  stat2Value?: string;
  stat2Label?: string;
  stat3Value?: string;
  stat3Label?: string;
  link?: string;
}

export default function AboutPreviewAdmin(props: AboutPreviewAdminProps) {
  const v = (key: keyof typeof DEFAULTS) =>
    (props[key] && props[key]!.trim() !== "" ? props[key] : DEFAULTS[key]) as string;

  const stats = [
    { value: v("stat1Value"), label: v("stat1Label") },
    { value: v("stat2Value"), label: v("stat2Label") },
    { value: v("stat3Value"), label: v("stat3Label") },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
      {/* Image side */}
      <div className="relative">
        <div className="aspect-[4/3] relative overflow-hidden rounded-xl shadow-xl">
          <Image
            src={v("image")}
            alt="Clinică stomatologică TechnicalDent"
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover"
            unoptimized
          />
          <div className="absolute inset-0 ring-1 ring-inset ring-black/8 rounded-xl pointer-events-none" />
        </div>

        {/* Badge */}
        <div className="absolute -bottom-6 -right-6 w-44 h-44 bg-white rounded-2xl shadow-lg p-6 hidden lg:flex flex-col justify-center">
          <p className="font-serif text-5xl font-semibold text-foreground leading-none">
            {v("years")}
          </p>
          <p className="mt-3 text-xs leading-snug text-muted-foreground">
            {v("badge")}
          </p>
        </div>
      </div>

      {/* Text side */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground mb-4">
          {v("subtitle")}
        </p>
        <h2 className="font-serif text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
          {v("title")}
        </h2>
        <div className="mt-6 space-y-4 text-muted-foreground leading-relaxed">
          <p>{v("p1")}</p>
          <p>{v("p2")}</p>
        </div>

        <div className="mt-8 flex gap-8">
          {stats.map((stat) => (
            <div key={stat.label}>
              <p className="font-serif text-2xl font-semibold text-foreground">
                {stat.value}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        <Link
          href="/despre"
          className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-foreground group"
        >
          {v("link")}
          <span className="inline-block transition-transform duration-200 group-hover:translate-x-1">
            →
          </span>
        </Link>
      </div>
    </div>
  );
}
