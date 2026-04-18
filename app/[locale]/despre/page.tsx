import { Link } from "@/i18n/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import Image from "next/image";
import Button from "@/components/Button";
import { getTeamMembers, getSetting } from "@/lib/data";
import { localizeTeamMember } from "@/lib/localize";
import { getAlternates } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "About" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: getAlternates("/despre", locale),
  };
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("About");
  const tNav = await getTranslations("Nav");
  const teamMembers = (await getTeamMembers()).map((m) =>
    localizeTeamMember(m, locale),
  );
  const aboutStoryImage =
    (await getSetting("aboutStoryImage")) || "/images/about-story.jpg";
  const facilityImage1 =
    (await getSetting("facilityImage1")) || "/images/facility-1.jpg";
  const facilityImage2 =
    (await getSetting("facilityImage2")) || "/images/facility-2.jpg";

  const values = [
    {
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      title: t("value1Title"),
      desc: t("value1Desc"),
    },
    {
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
          />
        </svg>
      ),
      title: t("value2Title"),
      desc: t("value2Desc"),
    },
    {
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
      ),
      title: t("value3Title"),
      desc: t("value3Desc"),
    },
    {
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
          />
        </svg>
      ),
      title: t("value4Title"),
      desc: t("value4Desc"),
    },
  ];

  return (
    <>
      {/* ── HERO ── */}
      <section className="relative min-h-[55vh] flex items-end pb-16 pt-[11rem]">
        <div className="absolute inset-0 overflow-hidden">
          <Image
            src={aboutStoryImage}
            alt="Clinică TechnicalDent"
            fill
            priority
            sizes="100vw"
            className="object-cover"
            style={{ filter: "brightness(0.38) saturate(0.7)" }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-transparent" />
        </div>
        <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8 w-full">
          <nav className="flex items-center gap-2 text-white/50 text-xs font-medium uppercase tracking-widest mb-6">
            <Link href="/" className="hover:text-white transition-colors">
              {tNav("acasa")}
            </Link>
            <span>/</span>
            <span className="text-white/80">{t("breadcrumbAbout")}</span>
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

      {/* ── STORY ── */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8 py-16 lg:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-4">
              {t("storySubtitle")}
            </p>
            <h2 className="font-serif text-3xl sm:text-4xl font-medium text-foreground tracking-tight">
              {t("storyTitle")}
            </h2>
            <div className="mt-6 space-y-4 text-muted-foreground leading-relaxed">
              <p>{t("storyP1")}</p>
              <p>{t("storyP2")}</p>
              <p>{t("storyP3")}</p>
            </div>
            <div className="mt-10 grid grid-cols-3 gap-6 pt-8 border-t border-border">
              {[
                { v: "2024", l: t("statFondare") },
                { v: "2+", l: t("statExperienta") },
                { v: "400+", l: t("statPacienti") },
              ].map((s) => (
                <div key={s.l}>
                  <p className="font-serif text-3xl font-semibold text-foreground">
                    {s.v}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{s.l}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="relative">
            <div className="aspect-[4/5] overflow-hidden rounded-2xl shadow-xl relative">
              <Image
                src={aboutStoryImage}
                alt={t("clinicaImgAlt")}
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
            </div>
            <div className="absolute -bottom-5 -left-5 w-36 h-36 bg-accent rounded-2xl hidden lg:flex items-center justify-center">
              <div className="text-center text-white">
                <p className="font-serif text-3xl font-bold leading-none">2+</p>
                <p className="text-[10px] font-semibold uppercase tracking-widest mt-1 opacity-80">
                  {t("badge")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── VALUES ── */}
      <section className="bg-muted">
        <div className="mx-auto max-w-7xl px-6 lg:px-8 py-16 lg:py-24">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-3">
              {t("valuesSubtitle")}
            </p>
            <h2 className="font-serif text-3xl sm:text-4xl font-medium text-foreground tracking-tight">
              {t("valuesTitle")}
            </h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              {t("valuesDescription")}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {values.map((v, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl p-7 shadow-sm border border-border/50 hover:shadow-md hover:-translate-y-1 transition-all duration-300"
              >
                <div className="w-11 h-11 rounded-xl bg-accent/10 text-accent flex items-center justify-center mb-5">
                  {v.icon}
                </div>
                <h3 className="font-serif text-lg font-medium text-foreground mb-3">
                  {v.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {v.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TEAM ── */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8 py-16 lg:py-24">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-3">
            {t("teamSubtitle")}
          </p>
          <h2 className="font-serif text-3xl sm:text-4xl font-medium text-foreground tracking-tight">
            {t("teamTitle")}
          </h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            {t("teamDescription")}
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {teamMembers.map((member) => (
            <div key={member.id} className="group">
              <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-muted">
                <Image
                  src={member.image}
                  alt={member.name}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="absolute inset-x-0 bottom-0 p-5 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                  <p className="text-xs text-white/70 leading-relaxed line-clamp-3">
                    {member.description}
                  </p>
                </div>
              </div>
              <div className="pt-5">
                <h3 className="font-serif text-lg font-medium text-foreground">
                  {member.name}
                </h3>
                <p className="text-sm font-medium text-accent mt-1">
                  {member.role}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FACILITY ── */}
      <section className="bg-muted">
        <div className="mx-auto max-w-7xl px-6 lg:px-8 py-16 lg:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div className="grid grid-cols-2 gap-4">
              <div className="aspect-[3/4] overflow-hidden rounded-2xl relative">
                <Image
                  src={facilityImage1}
                  alt={t("cabinetConsultatie")}
                  fill
                  sizes="(max-width: 1024px) 50vw, 25vw"
                  className="object-cover"
                />
              </div>
              <div className="aspect-[3/4] overflow-hidden rounded-2xl mt-8 relative">
                <Image
                  src={facilityImage2}
                  alt={t("echipamentModern")}
                  fill
                  sizes="(max-width: 1024px) 50vw, 25vw"
                  className="object-cover"
                />
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-4">
                {t("spaceSubtitle")}
              </p>
              <h2 className="font-serif text-3xl sm:text-4xl font-medium text-foreground tracking-tight">
                {t("spaceTitle")}
              </h2>
              <div className="mt-6 space-y-4 text-muted-foreground leading-relaxed">
                <p>{t("spaceP1")}</p>
                <p>{t("spaceP2")}</p>
              </div>
              <ul className="mt-6 space-y-3">
                {[
                  t("spaceList1"),
                  t("spaceList2"),
                  t("spaceList3"),
                  t("spaceList4"),
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-3 text-sm text-foreground"
                  >
                    <span className="w-5 h-5 rounded-full bg-accent/15 flex items-center justify-center flex-shrink-0">
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
                    {item}
                  </li>
                ))}
              </ul>
              <Button href="/galerie" variant="outline" className="mt-8">
                {t("veziGaleria")}
              </Button>
            </div>
          </div>
        </div>
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
                {t("programeazaVizita")}
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
