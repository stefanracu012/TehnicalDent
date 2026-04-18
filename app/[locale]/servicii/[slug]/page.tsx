import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { notFound } from "next/navigation";
import Button from "@/components/Button";
import { getServiceBySlug, getServices } from "@/lib/data";
import { localizeService } from "@/lib/localize";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getAlternates, getKeywords } from "@/lib/seo";
import { ServiceSchema, BreadcrumbSchema } from "@/components/JsonLd";

interface ServicePageProps {
  params: Promise<{ slug: string; locale: string }>;
}

export async function generateMetadata({ params }: ServicePageProps) {
  const { slug, locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("ServiceDetail");
  const service = await getServiceBySlug(slug);
  if (!service) return { title: t("serviciuNegasit") };
  const localized = localizeService(service, locale);
  return {
    title: localized.title as string,
    description: localized.shortDesc as string,
    keywords: getKeywords(
      [
        localized.title as string,
        localized.category as string,
        localized.shortDesc as string,
      ],
      locale,
    ),
    alternates: getAlternates(`/servicii/${slug}`, locale),
    openGraph: {
      title: `${localized.title} | TechnicalDent`,
      description: localized.shortDesc as string,
      type: "article",
      images: service.images?.[0] ? [{ url: service.images[0] as string }] : [],
    },
  };
}

export async function generateStaticParams() {
  const services = await getServices();
  return services.map((service) => ({ slug: service.slug }));
}

export default async function ServiceDetailPage({ params }: ServicePageProps) {
  const { slug, locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("ServiceDetail");
  const tNav = await getTranslations("Nav");
  const service = await getServiceBySlug(slug);
  if (!service) notFound();

  const s = localizeService(service, locale);

  const allServices = await getServices();
  const relatedServices = allServices
    .filter(
      (sv) => sv.slug !== service.slug && sv.category === service.category,
    )
    .slice(0, 3)
    .map((sv) => localizeService(sv, locale));

  const heroImage = service.images?.[0] as string || `/images/services/${service.slug}.jpg`;

  // Localized content from DB translations
  const title = s.title as string;
  const shortDesc = s.shortDesc as string;
  const overview = s.overview as string;
  const process = s.process as string;
  const recovery = s.recovery as string;
  const benefits = (Array.isArray(s.benefits) ? s.benefits : []) as string[];
  const category = s.category as string;
  const price = (service.price as number | null) ?? null;
  const discountPrice = (service.discountPrice as number | null) ?? null;

  return (
    <>
      <ServiceSchema
        title={title}
        description={shortDesc}
        slug={service.slug}
        category={category}
        image={service.images?.[0] as string | undefined}
      />
      <BreadcrumbSchema
        items={[
          { name: "TechnicalDent", url: `https://tehnicaldent.com/${locale}` },
          {
            name: tNav("servicii"),
            url: `https://tehnicaldent.com/${locale}/servicii`,
          },
          {
            name: title,
            url: `https://tehnicaldent.com/${locale}/servicii/${service.slug}`,
          },
        ]}
      />
      {/* ── HERO ── */}
      <section className="relative min-h-[55vh] flex items-end pb-16 pt-[11rem]">
        {/* Background */}
        <div className="absolute inset-0 overflow-hidden">
          <Image
            src={heroImage}
            alt={title}
            fill
            priority
            sizes="100vw"
            className="object-cover scale-105"
            style={{ filter: "brightness(0.45) saturate(0.8)" }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/20" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-transparent" />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8 w-full">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-white/50 text-xs font-medium uppercase tracking-widest mb-6">
            <Link href="/" className="hover:text-white transition-colors">
              {tNav("acasa")}
            </Link>
            <span>/</span>
            <Link
              href="/servicii"
              className="hover:text-white transition-colors"
            >
              {tNav("servicii")}
            </Link>
            <span>/</span>
            <span className="text-white/80">{title}</span>
          </nav>

          <span className="inline-block text-xs font-semibold uppercase tracking-[0.2em] text-accent mb-4">
            {category}
          </span>
          <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-medium text-white tracking-tight max-w-3xl">
            {title}
          </h1>
          <p className="mt-5 text-lg text-white/80 max-w-2xl leading-relaxed">
            {shortDesc}
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button
              href={`/contact?serviciu=${encodeURIComponent(title)}#formular`}
              size="lg"
            >
              {t("programeazaConsultatie")}
            </Button>
            <a
              href="tel:+37379950008"
              className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 text-white text-sm font-semibold px-6 py-3 rounded-sm hover:bg-white/20 transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                />
              </svg>
              +373 799 500 08
            </a>
          </div>
        </div>
      </section>

      {/* ── BODY ── */}
      <div className="mx-auto max-w-7xl px-6 lg:px-8 py-16 lg:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 lg:gap-16">
          {/* ── MAIN CONTENT ── */}
          <div className="lg:col-span-2 space-y-16">
            {/* Overview */}
            <div>
              <div className="flex items-center gap-3 mb-5">
                <span className="flex-shrink-0 w-9 h-9 rounded-full bg-foreground text-white text-sm font-bold flex items-center justify-center">
                  1
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    {t("prezentareSubtitle")}
                  </p>
                  <h2 className="font-serif text-2xl font-medium text-foreground">
                    {t("prezentareTitle")}
                  </h2>
                </div>
              </div>
              <p className="text-muted-foreground leading-relaxed text-lg pl-12">
                {overview}
              </p>
            </div>

            {/* Benefits */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <span className="flex-shrink-0 w-9 h-9 rounded-full bg-foreground text-white text-sm font-bold flex items-center justify-center">
                  2
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    {t("beneficiiSubtitle")}
                  </p>
                  <h2 className="font-serif text-2xl font-medium text-foreground">
                    {t("beneficiiTitle")}
                  </h2>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-12">
                {benefits.map((benefit, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 bg-muted rounded-xl p-4"
                  >
                    <span className="flex-shrink-0 mt-0.5 w-5 h-5 rounded-full bg-accent/15 flex items-center justify-center">
                      <svg
                        className="w-3 h-3 text-accent"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2.5}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </span>
                    <span className="text-sm text-foreground leading-relaxed">
                      {benefit}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Process — numbered steps */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <span className="flex-shrink-0 w-9 h-9 rounded-full bg-foreground text-white text-sm font-bold flex items-center justify-center">
                  3
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    {t("procesSubtitle")}
                  </p>
                  <h2 className="font-serif text-2xl font-medium text-foreground">
                    {t("procesTitle")}
                  </h2>
                </div>
              </div>
              <div className="space-y-0 pl-12">
                {process
                  .split(". ")
                  .filter((s) => s.trim().length > 10)
                  .map((step, i, arr) => (
                    <div key={i} className="flex gap-5">
                      {/* Circle + line column */}
                      <div className="flex flex-col items-center flex-shrink-0">
                        <span className="w-8 h-8 rounded-full bg-foreground text-white text-xs font-bold flex items-center justify-center">
                          {i + 1}
                        </span>
                        {i < arr.length - 1 && (
                          <div className="w-0.5 bg-border flex-1 my-2" />
                        )}
                      </div>
                      {/* Text */}
                      <p className="text-muted-foreground leading-relaxed text-sm pt-1 pb-8 last:pb-0">
                        {step.trim().replace(/\.$/, "")}.
                      </p>
                    </div>
                  ))}
              </div>
            </div>

            {/* Recovery */}
            <div className="bg-accent/5 border border-accent/15 rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-4">
                <span className="flex-shrink-0 w-9 h-9 rounded-full bg-accent text-white text-sm font-bold flex items-center justify-center">
                  4
                </span>
                <h2 className="font-serif text-xl font-medium text-foreground">
                  {t("recuperareTitle")}
                </h2>
              </div>
              <p className="text-muted-foreground leading-relaxed pl-12">
                {recovery}
              </p>
            </div>
          </div>

          {/* ── SIDEBAR ── */}
          <div className="lg:col-span-1">
            <div className="sticky top-32 space-y-5">
              {/* CTA card */}
              <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
                <div className="bg-foreground px-6 py-5">
                  <h3 className="font-serif text-lg font-medium text-white">
                    {t("sidebarTitle")}
                  </h3>
                  <p className="text-sm text-white/65 mt-1">
                    {t("sidebarDesc")}
                  </p>
                </div>
                <div className="px-6 py-6 space-y-3">
                  <Button
                    href={`/contact?serviciu=${encodeURIComponent(title)}#formular`}
                    className="w-full justify-center"
                  >
                    {t("programeazaAcum")}
                  </Button>
                  <a
                    href="tel:+37379950008"
                    className="flex items-center justify-center gap-2 w-full border border-border text-foreground text-sm font-semibold px-4 py-2.5 rounded-sm hover:bg-muted transition-colors"
                  >
                    <svg
                      className="w-4 h-4 text-muted-foreground"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                      />
                    </svg>
                    +373 799 500 08
                  </a>
                </div>
              </div>

              {/* Category badge */}
              <div className="rounded-2xl border border-border bg-muted px-6 py-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                  {t("categorie")}
                </p>
                <p className="font-medium text-foreground">{category}</p>
              </div>

              {/* Price card */}
              {price != null && (
                <div className="rounded-2xl border border-border bg-white px-6 py-5 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                    {t("pret")}
                  </p>
                  {discountPrice != null ? (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground line-through">
                          {price.toLocaleString()} MDL
                        </span>
                        <span className="text-[10px] font-semibold uppercase tracking-wider bg-accent/10 text-accent px-2 py-0.5 rounded-full">
                          {t("pretRedus")}
                        </span>
                      </div>
                      <p className="text-2xl font-bold text-accent">
                        {discountPrice.toLocaleString()} MDL
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t("deLa")} {discountPrice.toLocaleString()} MDL
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-2xl font-bold text-foreground">
                        {t("deLa")} {price.toLocaleString()} MDL
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Related services */}
              {relatedServices.length > 0 && (
                <div className="rounded-2xl border border-border bg-white overflow-hidden">
                  <p className="px-6 pt-5 pb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground border-b border-border">
                    {t("serviciiSimilare")}
                  </p>
                  <div className="divide-y divide-border">
                    {relatedServices.map((related) => (
                      <Link
                        key={related.slug}
                        href={`/servicii/${related.slug}`}
                        className="flex items-center gap-4 px-6 py-4 group hover:bg-muted transition-colors"
                      >
                        <div className="relative w-14 h-12 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                          <Image
                            src={related.images?.[0] as string || `/images/services/${related.slug}.jpg`}
                            alt={related.title}
                            fill
                            sizes="56px"
                            className="object-cover transition-transform duration-300 group-hover:scale-110"
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground group-hover:text-accent transition-colors truncate">
                            {related.title}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {related.category}
                          </p>
                        </div>
                        <svg
                          className="w-4 h-4 text-muted-foreground flex-shrink-0 ml-auto opacity-0 group-hover:opacity-100 transition-opacity"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Back link */}
              <Link
                href="/servicii"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                {t("toateServiciile")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
