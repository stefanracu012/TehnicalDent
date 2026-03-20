import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import Button from "@/components/Button";
import { getServiceBySlug, getServices } from "@/lib/data";
import { localizeService } from "@/lib/localize";
import { getTranslations, setRequestLocale } from "next-intl/server";

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
    title: localized.title,
    description: localized.shortDesc,
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

  const heroImage = `/images/services/${service.slug}.jpg`;

  // Localized content from DB translations
  const title = s.title as string;
  const shortDesc = s.shortDesc as string;
  const overview = s.overview as string;
  const process = s.process as string;
  const recovery = s.recovery as string;
  const benefits = (Array.isArray(s.benefits) ? s.benefits : []) as string[];
  const category = s.category as string;

  return (
    <>
      {/* ── HERO ── */}
      <section className="relative min-h-[55vh] flex items-end pb-16 pt-[11rem]">
        {/* Background */}
        <div className="absolute inset-0 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={heroImage}
            alt={title}
            className="w-full h-full object-cover scale-105"
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
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-3">
                {t("prezentareSubtitle")}
              </p>
              <h2 className="font-serif text-2xl font-medium text-foreground mb-5">
                {t("prezentareTitle")}
              </h2>
              <p className="text-muted-foreground leading-relaxed text-lg">
                {overview}
              </p>
            </div>

            {/* Benefits */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-3">
                {t("beneficiiSubtitle")}
              </p>
              <h2 className="font-serif text-2xl font-medium text-foreground mb-6">
                {t("beneficiiTitle")}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-3">
                {t("procesSubtitle")}
              </p>
              <h2 className="font-serif text-2xl font-medium text-foreground mb-6">
                {t("procesTitle")}
              </h2>
              <div className="space-y-0">
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
                <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <svg
                    className="w-5 h-5 text-accent"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                    />
                  </svg>
                </div>
                <h2 className="font-serif text-xl font-medium text-foreground">
                  {t("recuperareTitle")}
                </h2>
              </div>
              <p className="text-muted-foreground leading-relaxed">
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
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={`/images/services/${related.slug}.jpg`}
                            alt={related.title}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
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
