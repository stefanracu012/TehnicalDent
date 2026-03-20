import { Link } from "@/i18n/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Terms");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function TermeniConditii({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Terms");
  const tNav = await getTranslations("Nav");

  return (
    <>
      {/* ── HERO ── */}
      <section className="relative pt-[11rem] pb-16 bg-foreground overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.3) 1px, transparent 1px)",
              backgroundSize: "60px 60px",
            }}
          />
        </div>
        <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8">
          <nav className="flex items-center gap-2 text-white/50 text-xs uppercase tracking-widest mb-8">
            <Link href="/" className="hover:text-white transition-colors">
              {tNav("acasa")}
            </Link>
            <span>/</span>
            <span className="text-white/80">{t("breadcrumb")}</span>
          </nav>
          <h1 className="font-serif text-4xl sm:text-5xl font-medium text-white leading-tight tracking-tight">
            {t("heroTitle")}
            <br />
            <span className="italic font-normal text-white/60">
              {t("heroTitleAccent")}
            </span>
          </h1>
          <p className="mt-4 text-white/50 text-sm">
            {t("ultimaActualizare")} {new Date().toLocaleDateString(locale)}
          </p>
        </div>
      </section>

      {/* ── CONTENT ── */}
      <section className="py-16 lg:py-24">
        <div className="mx-auto max-w-3xl px-6 lg:px-8">
          <div className="prose prose-lg max-w-none space-y-10">
            {/* 1 */}
            <div>
              <h2 className="font-serif text-2xl font-medium text-foreground mb-4">
                {t("s1Title")}
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                {t("s1Text")}
              </p>
            </div>

            {/* 2 */}
            <div>
              <h2 className="font-serif text-2xl font-medium text-foreground mb-4">
                {t("s2Title")}
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                {t("s2Text")}
              </p>
            </div>

            {/* 3 */}
            <div>
              <h2 className="font-serif text-2xl font-medium text-foreground mb-4">
                {t("s3Title")}
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                {t("s3Text")}
              </p>
            </div>

            {/* 4 */}
            <div>
              <h2 className="font-serif text-2xl font-medium text-foreground mb-4">
                {t("s4Title")}
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                {t("s4Intro")}
              </p>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-accent mt-1.5">•</span>
                  <span>{t("s4L1")}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent mt-1.5">•</span>
                  <span>{t("s4L2")}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent mt-1.5">•</span>
                  <span>{t("s4L3")}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent mt-1.5">•</span>
                  <span>{t("s4L4")}</span>
                </li>
              </ul>
            </div>

            {/* 5 */}
            <div>
              <h2 className="font-serif text-2xl font-medium text-foreground mb-4">
                {t("s5Title")}
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                {t("s5Text")}
              </p>
            </div>

            {/* 6 */}
            <div>
              <h2 className="font-serif text-2xl font-medium text-foreground mb-4">
                {t("s6Title")}
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                {t("s6Text")}
              </p>
            </div>

            {/* 7 */}
            <div>
              <h2 className="font-serif text-2xl font-medium text-foreground mb-4">
                {t("s7Title")}
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                {t("s7Text")}
              </p>
            </div>

            {/* 8 */}
            <div>
              <h2 className="font-serif text-2xl font-medium text-foreground mb-4">
                {t("s8Title")}
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                {t("s8Text")}{" "}
                <Link
                  href="/politica-confidentialitate"
                  className="text-accent hover:underline"
                >
                  {t("s8Link")}
                </Link>
                {t("s8TextEnd")}
              </p>
            </div>

            {/* 9 */}
            <div>
              <h2 className="font-serif text-2xl font-medium text-foreground mb-4">
                {t("s9Title")}
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                {t("s9Text")}
              </p>
            </div>

            {/* 10 */}
            <div>
              <h2 className="font-serif text-2xl font-medium text-foreground mb-4">
                {t("s10Title")}
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                {t("s10Text")}
              </p>
            </div>

            {/* 11 */}
            <div>
              <h2 className="font-serif text-2xl font-medium text-foreground mb-4">
                {t("s11Title")}
              </h2>
              <div className="bg-muted p-6 rounded-lg space-y-2">
                <p className="text-foreground font-medium">TehnicalDent</p>
                <p className="text-muted-foreground text-sm">
                  Str. Sarmizegetusa 24/1, Chișinău, Republica Moldova
                </p>
                <p className="text-muted-foreground text-sm">
                  {t("contactEmail")}{" "}
                  <a
                    href="mailto:tehnicaldentmd@gmail.com"
                    className="text-accent hover:underline"
                  >
                    tehnicaldentmd@gmail.com
                  </a>
                </p>
                <p className="text-muted-foreground text-sm">
                  {t("contactTelefon")}{" "}
                  <a
                    href="tel:+37379950008"
                    className="text-accent hover:underline"
                  >
                    +373 799 500 08
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
