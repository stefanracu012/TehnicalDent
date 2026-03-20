/**
 * Reusable JSON-LD structured data component for SEO.
 * Renders a <script type="application/ld+json"> tag in the page head.
 */

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
    ro: "TechnicalDent — Clinică Stomatologică",
    en: "TechnicalDent — Dental Clinic",
    ru: "TechnicalDent — Стоматологическая клиника",
    it: "TechnicalDent — Clinica Odontoiatrica",
  };
  const descriptions: Record<string, string> = {
    ro: "Clinica stomatologică TechnicalDent din Chișinău oferă servicii de înaltă calitate: implant dentar, estetică dentară, ortodonție, chirurgie orală și tratamente moderne.",
    en: "TechnicalDent dental clinic in Chisinau offers high-quality services: dental implants, cosmetic dentistry, orthodontics, oral surgery and modern treatments.",
    ru: "Стоматологическая клиника TechnicalDent в Кишинёве предлагает высококачественные услуги: зубные импланты, эстетическую стоматологию, ортодонтию, хирургию и современные методы лечения.",
    it: "La clinica odontoiatrica TechnicalDent a Chisinau offre servizi di alta qualità: impianti dentali, odontoiatria estetica, ortodonzia, chirurgia orale e trattamenti moderni.",
  };

  const data = {
    "@context": "https://schema.org",
    "@type": ["Dentist", "MedicalBusiness", "LocalBusiness"],
    name: "TechnicalDent",
    alternateName: names[locale] || names.ro,
    description: descriptions[locale] || descriptions.ro,
    url: "https://tehnicaldent.com",
    logo: "https://tehnicaldent.com/images/logo.svg",
    image: "https://tehnicaldent.com/images/hero-dentist.jpg",
    telephone: "+37379950008",
    email: "tehnicaldentmd@gmail.com",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Chișinău",
      addressCountry: "MD",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: 47.0105,
      longitude: 28.8638,
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
    sameAs: [
      "https://www.facebook.com/TechnicalDent",
      "https://www.instagram.com/TechnicalDent",
    ],
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
      name: "TechnicalDent",
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
      name: author || "TechnicalDent",
    },
    publisher: {
      "@type": "Organization",
      name: "TechnicalDent",
      logo: {
        "@type": "ImageObject",
        url: "https://tehnicaldent.com/images/logo.svg",
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
