import { Link } from "@/i18n/navigation";
import Button from "@/components/Button";
import ServicesGrid from "@/components/ServicesGrid";
import { getServices } from "@/lib/data";
import { localizeService } from "@/lib/localize";
import { getTranslations, setRequestLocale } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Services");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function ServicesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Services");
  const tNav = await getTranslations("Nav");
  const services = (await getServices()).map((s) => localizeService(s, locale));

  return (
    <>
      {/* ── HERO ── */}
      <section className="relative min-h-[50vh] flex items-end pb-16 pt-[11rem]">
        <div className="absolute inset-0 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/hero-dentist.jpg"
            alt="Clinică stomatologică TechnicalDent"
            className="w-full h-full object-cover"
            style={{ filter: "brightness(0.38) saturate(0.7)" }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent" />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8 w-full">
          <nav className="flex items-center gap-2 text-white/50 text-xs font-medium uppercase tracking-widest mb-6">
            <Link href="/" className="hover:text-white transition-colors">
              {tNav("acasa")}
            </Link>
            <span>/</span>
            <span className="text-white/80">{t("breadcrumbServicii")}</span>
          </nav>
          <span className="inline-block text-xs font-semibold uppercase tracking-[0.2em] text-accent mb-4">
            {t("heroSubtitle")}
          </span>
          <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-medium text-white tracking-tight max-w-3xl">
            {t("heroTitle")}
          </h1>
          <p className="mt-5 text-lg text-white/80 max-w-2xl leading-relaxed">
            {t("heroDescription")}
          </p>
        </div>
      </section>

      {/* ── GRID ── */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8 py-16 lg:py-24">
        <ServicesGrid services={services} />
      </section>

      {/* ── CTA ── */}
      <section className="bg-foreground">
        <div className="mx-auto max-w-7xl px-6 lg:px-8 py-16 lg:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/40 mb-4">
                {t("ctaSubtitle")}
              </p>
              <h2 className="font-serif text-3xl sm:text-4xl font-medium text-white tracking-tight">
                {t("ctaTitle")}
              </h2>
              <p className="mt-5 text-white/65 leading-relaxed text-lg">
                {t("ctaDescription")}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 lg:justify-end">
              <Button href="/contact" size="lg">
                {t("programeazaConsultatie")}
              </Button>
              <a
                href="tel:+37379950008"
                className="inline-flex items-center justify-center gap-2 bg-white/10 border border-white/20 text-white text-sm font-semibold px-6 py-3 rounded-sm hover:bg-white/20 transition-colors"
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
        </div>
      </section>
    </>
  );
}
