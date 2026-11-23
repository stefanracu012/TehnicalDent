/**
 * Reusable JSON-LD structured data component for SEO.
 * Renders a <script type="application/ld+json"> tag in the page head.
 */

import { CLINIC } from "@/lib/seo";

interface JsonLdProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>;
}

export default function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

/**
 * LocalBusiness / Dentist schema for the clinic.
 */
export function DentistSchema({ locale }: { locale: string }) {
  const names: Record<string, string> = {
    ro: "TehnicalDent — Clinică Stomatologică",
    en: "TehnicalDent — Dental Clinic",
    ru: "TehnicalDent — Стоматологическая клиника",
    it: "TehnicalDent — Clinica Odontoiatrica",
  };
  const descriptions: Record<string, string> = {
    ro: "Clinică stomatologică în Chișinău, sectorul Botanica. Implantologie, ortodonție, estetică dentară, tratament de canal, protetică și stomatologie pentru copii.",
    en: "Dental clinic in Chisinau, Botanica district. Dental implants, orthodontics, cosmetic dentistry, root canal treatment, prosthetics and pediatric dentistry.",
    ru: "Стоматологическая клиника в Кишинёве, сектор Ботаника. Имплантация, ортодонтия, эстетическая стоматология, лечение каналов, протезирование и детская стоматология.",
    it: "Clinica odontoiatrica a Chisinau, settore Botanica. Implantologia, ortodonzia, odontoiatria estetica, devitalizzazione, protesi e odontoiatria pediatrica.",
  };
  const areaServed: Record<string, string> = {
    ro: "Chișinău, Republica Moldova",
    en: "Chisinau, Republic of Moldova",
    ru: "Кишинёв, Республика Молдова",
    it: "Chisinau, Repubblica di Moldova",
  };

  const data = {
    "@context": "https://schema.org",
    "@type": ["Dentist", "MedicalBusiness", "LocalBusiness"],
    "@id": "https://www.tehnicaldent.com/#clinic",
    name: CLINIC.name,
    // "Tehnical Dent" is how the Google Business Profile spells it and by far
    // the most common way people search for us — declare both so the entity
    // resolves to one business instead of two.
    alternateName: ["Tehnical Dent", names[locale] || names.ro],
    description: descriptions[locale] || descriptions.ro,
    url: "https://www.tehnicaldent.com",
    logo: "https://www.tehnicaldent.com/images/logo.png",
    image: "https://www.tehnicaldent.com/images/hero-dentist.jpg",
    telephone: CLINIC.telephone,
    email: CLINIC.email,
    // Mirrors the Google Business Profile listing field for field — a mismatch
    // splits the business into two entities in local search.
    address: {
      "@type": "PostalAddress",
      streetAddress: CLINIC.streetAddress,
      addressLocality: CLINIC.locality,
      postalCode: CLINIC.postalCode,
      addressCountry: CLINIC.country,
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: CLINIC.latitude,
      longitude: CLINIC.longitude,
    },
    hasMap: CLINIC.mapsUrl,
    areaServed: {
      "@type": "City",
      name: areaServed[locale] || areaServed.ro,
    },
    openingHoursSpecification: [
      // The same as the Google Business Profile: Monday–Friday 09:00–18:00,
      // closed at the weekend. Google compares these; a Saturday here that the
      // profile does not have would be a mismatch. The clinic sometimes works a
      // Saturday — that is said in the footer and by the assistant, not here.
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        opens: "09:00",
        closes: "18:00",
      },
    ],
    priceRange: "$$",
    // Only verified profiles belong here — a sameAs pointing at a URL we do not
    // control weakens entity resolution instead of strengthening it.
    sameAs: [CLINIC.mapsUrl],
    // Booking is possible online, on the contact page: choose a service, a
    // doctor and a free time from the doctors' calendars.
    potentialAction: {
      "@type": "ReserveAction",
      name: "Programare online",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `https://www.tehnicaldent.com/${locale}/contact`,
        inLanguage: locale,
        actionPlatform: [
          "http://schema.org/DesktopWebPlatform",
          "http://schema.org/MobileWebPlatform",
        ],
      },
      result: { "@type": "Reservation", name: "Programare la clinică" },
    },
    medicalSpecialty: [
      "Dentistry",
      "Orthodontics",
      "Endodontics",
      "Periodontics",
      "Pediatric Dentistry",
      "Oral Surgery",
      "Cosmetic Dentistry",
    ],
    availableService: {
      "@type": "MedicalProcedure",
      name: "Dental Services",
      procedureType: "http://schema.org/NoninvasiveProcedure",
    },
  };

  return <JsonLd data={data} />;
}

/**
 * Service schema for individual service pages.
 */
export function ServiceSchema({
  title,
  description,
  slug,
  category,
  image,
  locale = "ro",
  price,
  discountPrice,
  priceIsRange,
}: {
  title: string;
  description: string;
  slug: string;
  category: string;
  image?: string;
  locale?: string;
  /** The regular price in MDL, when the service has one. */
  price?: number | null;
  /** The current promotional price, when there is one. */
  discountPrice?: number | null;
  /** The price is a lower bound ("1000–1200 lei"), not one figure. */
  priceIsRange?: boolean;
}) {
  // What a visitor pays today: the promotional price when there is one. A range
  // is published as "from", never as a single figure it is not.
  const current = discountPrice ?? price ?? null;
  const offers =
    current && current > 0
      ? priceIsRange
        ? {
            "@type": "Offer",
            priceSpecification: {
              "@type": "PriceSpecification",
              minPrice: current,
              priceCurrency: "MDL",
            },
            availability: "https://schema.org/InStock",
            url: `https://www.tehnicaldent.com/${locale}/contact`,
          }
        : {
            "@type": "Offer",
            price: current,
            priceCurrency: "MDL",
            availability: "https://schema.org/InStock",
            url: `https://www.tehnicaldent.com/${locale}/contact`,
          }
      : null;

  const data = {
    "@context": "https://schema.org",
    "@type": "MedicalProcedure",
    name: title,
    description,
    url: `https://www.tehnicaldent.com/${locale}/servicii/${slug}`,
    category,
    provider: {
      "@type": "Dentist",
      "@id": "https://www.tehnicaldent.com/#clinic",
      name: "TehnicalDent",
      url: "https://www.tehnicaldent.com",
    },
    ...(offers ? { offers } : {}),
    ...(image ? { image } : {}),
  };

  return <JsonLd data={data} />;
}

/**
 * The team on the About page, one Person per member, tied to the clinic. Only
 * what the page itself shows: name, role, photo.
 */
export function TeamSchema({
  members,
  locale,
}: {
  members: { name: string; role: string; image?: string | null }[];
  locale: string;
}) {
  const absolute = (src?: string | null) =>
    src ? (src.startsWith("http") ? src : `https://www.tehnicaldent.com${src}`) : undefined;
  const data = {
    "@context": "https://schema.org",
    "@graph": members.map((m) => ({
      "@type": "Person",
      name: m.name,
      jobTitle: m.role,
      ...(absolute(m.image) ? { image: absolute(m.image) } : {}),
      url: `https://www.tehnicaldent.com/${locale}/despre`,
      worksFor: { "@id": "https://www.tehnicaldent.com/#clinic" },
    })),
  };
  return <JsonLd data={data} />;
}

/**
 * FAQPage for questions that are answered, word for word, on the page.
 * Google no longer shows FAQ rich results for most commercial sites, so the
 * value is in the visible answers; the markup is harmless and accurate.
 */
export function FaqSchema({ items }: { items: { question: string; answer: string }[] }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((i) => ({
      "@type": "Question",
      name: i.question,
      acceptedAnswer: { "@type": "Answer", text: i.answer },
    })),
  };
  return <JsonLd data={data} />;
}

/**
 * Article / BlogPosting schema for blog posts.
 */
export function ArticleSchema({
  title,
  description,
  slug,
  image,
  datePublished,
  dateModified,
  author,
  locale = "ro",
}: {
  title: string;
  description: string;
  slug: string;
  image?: string;
  datePublished: string;
  /** When the article last changed — a freshness signal. */
  dateModified?: string;
  author: string;
  locale?: string;
}) {
  // The address of THIS language's version. It was always the Romanian one, so
  // an English or Russian article declared itself a copy of the Romanian page.
  const url = `https://www.tehnicaldent.com/${locale}/recomandari/${slug}`;
  const absoluteImage = image
    ? image.startsWith("http")
      ? image
      : `https://www.tehnicaldent.com${image}`
    : undefined;

  const data = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: title,
    description,
    url,
    inLanguage: locale,
    datePublished,
    dateModified: dateModified ?? datePublished,
    author: {
      "@type": "Organization",
      name: author || "TehnicalDent",
    },
    publisher: {
      "@type": "Organization",
      "@id": "https://www.tehnicaldent.com/#clinic",
      name: "TehnicalDent",
      logo: {
        "@type": "ImageObject",
        url: "https://www.tehnicaldent.com/images/logo.png",
      },
    },
    ...(absoluteImage ? { image: absoluteImage } : {}),
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
  };

  return <JsonLd data={data} />;
}

/**
 * The website itself, tied to the clinic as its publisher. Says which
 * languages exist, and that "Tehnical Dent" and "TehnicalDent" are one name.
 */
export function WebSiteSchema() {
  const data = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": "https://www.tehnicaldent.com/#website",
    url: "https://www.tehnicaldent.com",
    name: "TehnicalDent",
    alternateName: ["Tehnical Dent", "TehnicalDent Chișinău"],
    inLanguage: ["ro-MD", "ru-MD", "en", "it"],
    publisher: { "@id": "https://www.tehnicaldent.com/#clinic" },
  };
  return <JsonLd data={data} />;
}

/**
 * BreadcrumbList schema.
 */
export function BreadcrumbSchema({
  items,
}: {
  items: { name: string; url: string }[];
}) {
  const data = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return <JsonLd data={data} />;
}
