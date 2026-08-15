import { Link } from "@/i18n/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getAlternates } from "@/lib/seo";

// Bumped by hand whenever the policy text changes — a privacy policy that
// claims "last updated: today" on every page view is worthless as a record.
const LAST_UPDATED = "2026-08-15";

const CONTACT_EMAIL = "tehnicaldentmd@gmail.com";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Privacy");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: getAlternates("/politica-confidentialitate", locale),
  };
}

export default async function PoliticaConfidentialitate({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Privacy");
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
            {t("ultimaActualizare")}{" "}
            {new Date(`${LAST_UPDATED}T00:00:00Z`).toLocaleDateString(locale, {
              day: "numeric",
              month: "long",
              year: "numeric",
              timeZone: "UTC",
            })}
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
              <p className="text-muted-foreground leading-relaxed mb-4">
                {t("s2Intro")}
              </p>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-accent mt-1.5">•</span>
                  <span>
                    <strong className="text-foreground">
                      {t("s2L1Label")}
                    </strong>{" "}
                    {t("s2L1Text")}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent mt-1.5">•</span>
                  <span>
                    <strong className="text-foreground">
                      {t("s2L2Label")}
                    </strong>{" "}
                    {t("s2L2Text")}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent mt-1.5">•</span>
                  <span>
                    <strong className="text-foreground">
                      {t("s2L3Label")}
                    </strong>{" "}
                    {t("s2L3Text")}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent mt-1.5">•</span>
                  <span>
                    <strong className="text-foreground">
                      {t("s2L4Label")}
                    </strong>{" "}
                    {t("s2L4Text")}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent mt-1.5">•</span>
                  <span>
                    <strong className="text-foreground">
                      {t("s2L5Label")}
                    </strong>{" "}
                    {t("s2L5Text")}
                  </span>
                </li>
              </ul>
            </div>

            {/* 3 */}
            <div>
              <h2 className="font-serif text-2xl font-medium text-foreground mb-4">
                {t("s3Title")}
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                {t("s3Intro")}
              </p>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-accent mt-1.5">•</span>
                  <span>{t("s3L1")}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent mt-1.5">•</span>
                  <span>{t("s3L2")}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent mt-1.5">•</span>
                  <span>{t("s3L3")}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent mt-1.5">•</span>
                  <span>{t("s3L4")}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent mt-1.5">•</span>
                  <span>{t("s3L5")}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent mt-1.5">•</span>
                  <span>{t("s3L6")}</span>
                </li>
              </ul>
            </div>

            {/* 4 */}
            <div>
              <h2 className="font-serif text-2xl font-medium text-foreground mb-4">
                {t("s4Title")}
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                {t("s4Text")}
              </p>
            </div>

            {/* 5 — Meta messaging channels. Anchor is locale-independent so the
                same URL can be given to Meta and linked from anywhere. */}
            <div id="messaging" className="scroll-mt-32">
              <h2 className="font-serif text-2xl font-medium text-foreground mb-4">
                {t("s5Title")}
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                {t("s5Intro")}
              </p>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-accent mt-1.5">•</span>
                  <span>
                    <strong className="text-foreground">
                      {t("s5L1Label")}
                    </strong>{" "}
                    {t("s5L1Text")}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent mt-1.5">•</span>
                  <span>
                    <strong className="text-foreground">
                      {t("s5L2Label")}
                    </strong>{" "}
                    {t("s5L2Text")}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent mt-1.5">•</span>
                  <span>
                    <strong className="text-foreground">
                      {t("s5L3Label")}
                    </strong>{" "}
                    {t("s5L3Text")}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent mt-1.5">•</span>
                  <span>
                    <strong className="text-foreground">
                      {t("s5L4Label")}
                    </strong>{" "}
                    {t("s5L4Text")}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent mt-1.5">•</span>
                  <span>
                    <strong className="text-foreground">
                      {t("s5L5Label")}
                    </strong>{" "}
                    {t("s5L5Text")}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent mt-1.5">•</span>
                  <span>
                    <strong className="text-foreground">
                      {t("s5L6Label")}
                    </strong>{" "}
                    {t("s5L6Text")}
                  </span>
                </li>
              </ul>
              <p className="mt-4 border-l-2 border-accent/40 pl-4 text-sm text-muted-foreground leading-relaxed">
                {t("s5Note")}
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

            {/* 8 — deletion procedure. Meta requires this to be reachable at a
                stable, clearly marked URL: /politica-confidentialitate#data-deletion */}
            <div id="data-deletion" className="scroll-mt-32">
              <h2 className="font-serif text-2xl font-medium text-foreground mb-4">
                {t("s8Title")}
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                {t("s8Intro")}
              </p>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-accent mt-1.5">•</span>
                  <span>{t("s8L1")}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent mt-1.5">•</span>
                  <span>{t("s8L2")}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent mt-1.5">•</span>
                  <span>{t("s8L3")}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent mt-1.5">•</span>
                  <span>{t("s8L4")}</span>
                </li>
              </ul>
              <div className="mt-4 bg-muted p-6 rounded-lg">
                <p className="text-foreground font-medium">{t("s8MailCta")}</p>
                <a
                  href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
                    t("s8MailSubject"),
                  )}`}
                  className="text-accent hover:underline break-all"
                >
                  {CONTACT_EMAIL}
                </a>
              </div>
              <p className="mt-4 border-l-2 border-accent/40 pl-4 text-sm text-muted-foreground leading-relaxed">
                {t("s8Note")}
              </p>
            </div>

            {/* 9 */}
            <div>
              <h2 className="font-serif text-2xl font-medium text-foreground mb-4">
                {t("s9Title")}
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                {t("s9Intro")}
              </p>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-accent mt-1.5">•</span>
                  <span>
                    <strong className="text-foreground">
                      {t("s9L1Label")}
                    </strong>{" "}
                    {t("s9L1Text")}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent mt-1.5">•</span>
                  <span>
                    <strong className="text-foreground">
                      {t("s9L2Label")}
                    </strong>{" "}
                    {t("s9L2Text")}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent mt-1.5">•</span>
                  <span>
                    <strong className="text-foreground">
                      {t("s9L3Label")}
                    </strong>{" "}
                    {t("s9L3Text")}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent mt-1.5">•</span>
                  <span>
                    <strong className="text-foreground">
                      {t("s9L4Label")}
                    </strong>{" "}
                    {t("s9L4Text")}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent mt-1.5">•</span>
                  <span>
                    <strong className="text-foreground">
                      {t("s9L5Label")}
                    </strong>{" "}
                    {t("s9L5Text")}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent mt-1.5">•</span>
                  <span>
                    <strong className="text-foreground">
                      {t("s9L6Label")}
                    </strong>{" "}
                    {t("s9L6Text")}
                  </span>
                </li>
              </ul>
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
              <p className="text-muted-foreground leading-relaxed">
                {t("s11Text")}
              </p>
              <div className="mt-4 bg-muted p-6 rounded-lg space-y-2">
                <p className="text-foreground font-medium">TehnicalDent</p>
                <p className="text-muted-foreground text-sm">
                  Str. Sarmizegetusa 24/1, Chișinău, Republica Moldova
                </p>
                <p className="text-muted-foreground text-sm">
                  {t("contactEmail")}{" "}
                  <a
                    href={`mailto:${CONTACT_EMAIL}`}
                    className="text-accent hover:underline"
                  >
                    {CONTACT_EMAIL}
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
