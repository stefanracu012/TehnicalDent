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
    "@id": "https://tehnicaldent.com/#clinic",
    name: CLINIC.name,
    // "Tehnical Dent" is how the Google Business Profile spells it and by far
    // the most common way people search for us — declare both so the entity
    // resolves to one business instead of two.
    alternateName: ["Tehnical Dent", names[locale] || names.ro],
    description: descriptions[locale] || descriptions.ro,
    url: "https://tehnicaldent.com",
    logo: "https://tehnicaldent.com/images/logo.png",
    image: "https://tehnicaldent.com/images/hero-dentist.jpg",
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
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        opens: "09:00",
        closes: "18:00",
      },
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: "Saturday",
        opens: "09:00",
        closes: "14:00",
      },
    ],
    priceRange: "$$",
    // Only verified profiles belong here — a sameAs pointing at a URL we do not
    // control weakens entity resolution instead of strengthening it.
    sameAs: [CLINIC.mapsUrl],
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
}: {
  title: string;
  description: string;
  slug: string;
  category: string;
  image?: string;
}) {
  const data = {
    "@context": "https://schema.org",
    "@type": "MedicalProcedure",
    name: title,
    description,
    url: `https://tehnicaldent.com/ro/servicii/${slug}`,
    category,
    provider: {
      "@type": "Dentist",
      name: "TehnicalDent",
      url: "https://tehnicaldent.com",
    },
    ...(image ? { image } : {}),
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
  author,
}: {
  title: string;
  description: string;
  slug: string;
  image?: string;
  datePublished: string;
  author: string;
}) {
  const data = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: title,
    description,
    url: `https://tehnicaldent.com/ro/recomandari/${slug}`,
    datePublished,
    author: {
      "@type": "Organization",
      name: author || "TehnicalDent",
    },
    publisher: {
      "@type": "Organization",
      name: "TehnicalDent",
      logo: {
        "@type": "ImageObject",
        url: "https://tehnicaldent.com/images/logo.png",
      },
    },
    ...(image ? { image } : {}),
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://tehnicaldent.com/ro/recomandari/${slug}`,
    },
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
