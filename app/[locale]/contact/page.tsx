import { Metadata } from "next";
import ContactForm from "@/components/ContactForm";
import { Link } from "@/i18n/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Contact");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

const MAPS_URL =
  "https://www.google.com/maps/place/Tehnical+Dent/@46.9856812,28.8717643,758m/data=!3m2!1e3!4b1!4m6!3m5!1s0x40c979000cb65367:0x895fbc82126b33dc!8m2!3d46.9856776!4d28.8743392!16s%2Fg%2F11xfj0xg_7?entry=ttu";

const MAPS_EMBED =
  "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1362.2!2d28.8717643!3d46.9856812!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x40c979000cb65367%3A0x895fbc82126b33dc!2sTehnical%20Dent!5e0!3m2!1sro!2smd!4v1711000000000!5m2!1sro!2smd";

export default async function ContactPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ serviciu?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { serviciu } = await searchParams;
  const t = await getTranslations("Contact");

  return (
    <>
      {/* ── HERO ── */}
      <section className="relative pt-[11rem] pb-20 lg:pb-28 bg-foreground overflow-hidden">
        {/* Decorative grid */}
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
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent mb-5">
              {t("subtitle")}
            </p>
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-medium text-white leading-[1.08] tracking-tight">
              {t("heroTitle")}
              <br />
              <span className="italic font-normal text-white/60">
                {t("heroTitleAccent")}
              </span>
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-white/60 max-w-xl">
              {t("heroDescription")}
            </p>
          </div>

          {/* Quick contact cards */}
          <div className="mt-14 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Phone */}
            <a
              href="tel:+37379950008"
              className="group flex items-center gap-5 bg-white/5 border border-white/10 p-6 hover:bg-white/10 hover:border-white/20 transition-all duration-300"
            >
              <div className="shrink-0 w-12 h-12 flex items-center justify-center bg-white/10 group-hover:bg-accent/20 transition-colors duration-300">
                <svg
                  className="w-5 h-5 text-white group-hover:text-accent transition-colors"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-xs text-white/40 uppercase tracking-widest mb-1">
                  {t("telefon")}
                </p>
                <p className="text-white font-medium">+373 799 500 08</p>
              </div>
            </a>

            {/* Email */}
            <a
              href="mailto:tehnicaldentmd@gmail.com"
              className="group flex items-center gap-5 bg-white/5 border border-white/10 p-6 hover:bg-white/10 hover:border-white/20 transition-all duration-300"
            >
              <div className="shrink-0 w-12 h-12 flex items-center justify-center bg-white/10 group-hover:bg-accent/20 transition-colors duration-300">
                <svg
                  className="w-5 h-5 text-white group-hover:text-accent transition-colors"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                  />
                </svg>
              </div>
              <div>
                <p className="text-xs text-white/40 uppercase tracking-widest mb-1">
                  {t("email")}
                </p>
                <p className="text-white font-medium">
                  tehnicaldentmd@gmail.com
                </p>
              </div>
            </a>

            {/* Location */}
            <a
              href={MAPS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-5 bg-white/5 border border-white/10 p-6 hover:bg-white/10 hover:border-white/20 transition-all duration-300"
            >
              <div className="shrink-0 w-12 h-12 flex items-center justify-center bg-white/10 group-hover:bg-accent/20 transition-colors duration-300">
                <svg
                  className="w-5 h-5 text-white group-hover:text-accent transition-colors"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-xs text-white/40 uppercase tracking-widest mb-1">
                  {t("adresa")}
                </p>
                <p className="text-white font-medium">{t("adresaValue")}</p>
              </div>
            </a>
          </div>
        </div>
      </section>

      {/* ── FORM + INFO ── */}
      <section id="formular" className="py-20 lg:py-28 scroll-mt-44">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-20">
            {/* Form side */}
            <div className="lg:col-span-7">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent mb-3">
                {t("scrieNe")}
              </p>
              <h2 className="font-serif text-3xl sm:text-4xl font-medium text-foreground leading-tight mb-3">
                {t("trimiteMesaj")}
              </h2>
              <p className="text-muted-foreground mb-10 max-w-lg">
                {t("formularDesc")}
              </p>
              <ContactForm defaultService={serviciu} />
            </div>

            {/* Info side */}
            <div className="lg:col-span-5">
              <div className="lg:sticky lg:top-40">
                {/* Schedule */}
                <div className="bg-muted p-8 lg:p-10 mb-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 flex items-center justify-center bg-foreground/8">
                      <svg
                        className="w-5 h-5 text-foreground/60"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <h3 className="font-serif text-xl font-medium text-foreground">
                      {t("programDeLucru")}
                    </h3>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-border">
                      <span className="text-sm text-foreground font-medium">
                        {t("luniVineri")}
                      </span>
                      <span className="text-sm text-foreground tabular-nums">
                        {t("luniVineriOre")}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-border">
                      <span className="text-sm text-foreground font-medium">
                        {t("sambata")}
                      </span>
                      <span className="text-sm text-foreground tabular-nums">
                        {t("sambataOre")}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm text-foreground font-medium">
                        {t("duminica")}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {t("inchis")}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quick actions */}
                <div className="space-y-3">
                  <a
                    href="https://wa.me/37379950008"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-4 bg-white border border-border p-5 hover:border-[#25D366]/40 transition-colors duration-300"
                  >
                    <div className="shrink-0 w-10 h-10 flex items-center justify-center bg-[#25D366]/10 text-[#25D366]">
                      <svg
                        className="w-5 h-5"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                        <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.553 4.126 1.522 5.862L0 24l6.335-1.652A11.948 11.948 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75c-1.97 0-3.834-.553-5.45-1.513l-.39-.232-3.758.98.999-3.648-.254-.404A9.71 9.71 0 012.25 12 9.75 9.75 0 0112 2.25 9.75 9.75 0 0121.75 12 9.75 9.75 0 0112 21.75z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {t("scriePeWhatsApp")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t("whatsAppDesc")}
                      </p>
                    </div>
                    <svg
                      className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                      />
                    </svg>
                  </a>

                  <a
                    href="viber://chat?number=%2B37379950008"
                    className="group flex items-center gap-4 bg-white border border-border p-5 hover:border-[#7360F2]/40 transition-colors duration-300"
                  >
                    <div className="shrink-0 w-10 h-10 flex items-center justify-center bg-[#7360F2]/10 text-[#7360F2]">
                      <svg
                        className="w-5 h-5"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M11.4 0C9.473.028 5.333.344 3.02 2.467 1.302 4.187.696 6.7.633 9.817.57 12.933.488 18.776 6.12 20.36h.003l-.004 2.416s-.037.977.61 1.177c.777.242 1.234-.5 1.98-1.302.407-.44.972-1.084 1.397-1.58 3.85.326 6.812-.416 7.15-.525.776-.252 5.176-.816 5.892-6.657.74-6.02-.36-9.83-2.34-11.546-.596-.55-3.006-2.3-8.375-2.323 0 0-.395-.025-1.037-.017zm.058 1.693c.545-.004.88.017.88.017 4.542.02 6.717 1.388 7.222 1.846 1.675 1.435 2.53 4.868 1.906 9.897v.002c-.604 4.878-4.174 5.184-4.832 5.395-.28.09-2.882.737-6.153.524 0 0-2.436 2.94-3.197 3.704-.12.12-.26.167-.352.144-.13-.033-.166-.188-.165-.414l.02-4.018c-4.762-1.32-4.485-6.292-4.43-8.895.054-2.604.543-4.738 1.996-6.173 1.96-1.773 5.474-2.018 7.11-2.03zm.38 2.602c-.167 0-.303.135-.304.302 0 .167.133.303.3.305 1.624.01 2.946.537 4.028 1.592 1.073 1.046 1.62 2.468 1.633 4.334.002.167.14.3.307.3.166-.002.3-.138.3-.304-.014-1.984-.618-3.596-1.816-4.764-1.19-1.16-2.692-1.753-4.447-1.765zm-3.96.695c-.19-.032-.4.005-.616.117l-.01.002c-.43.247-.816.562-1.146.932-.002.004-.006.004-.008.008-.267.323-.42.638-.46.948-.008.046-.01.093-.007.14 0 .136.022.27.065.4l.013.01c.135.48.473 1.276 1.205 2.604.42.768.903 1.5 1.446 2.186.27.344.56.673.87.984l.132.132c.31.308.64.6.984.87.686.543 1.418 1.027 2.186 1.447 1.328.733 2.126 1.07 2.604 1.206l.01.014c.13.042.265.064.402.063.046.002.092 0 .138-.008.31-.036.627-.19.948-.46.004 0 .003-.002.008-.005.37-.33.683-.72.93-1.148l.003-.01c.225-.432.15-.842-.18-1.12-.004 0-.698-.58-1.037-.83-.36-.255-.73-.492-1.113-.71-.51-.285-1.032-.106-1.248.174l-.447.564c-.23.283-.657.246-.657.246-3.12-.796-3.955-3.955-3.955-3.955s-.037-.426.248-.656l.563-.448c.277-.215.456-.737.17-1.248-.217-.383-.454-.756-.71-1.115-.25-.34-.826-1.033-.83-1.035-.137-.165-.31-.265-.502-.297zm4.49.88c-.158.002-.29.124-.3.282-.01.167.115.312.282.324 1.16.085 2.017.466 2.645 1.15.63.688.93 1.524.906 2.57-.002.168.13.306.3.31.166.003.305-.13.31-.297.025-1.175-.334-2.193-1.067-2.994-.74-.81-1.777-1.253-3.05-1.346h-.024zm.463 1.63c-.16.002-.29.127-.3.287-.008.167.12.31.288.32.523.028.875.175 1.113.422.24.245.388.62.416 1.164.01.167.15.295.318.287.167-.008.295-.15.287-.317-.034-.666-.23-1.195-.587-1.562-.357-.368-.85-.573-1.51-.62-.008 0-.017-.002-.025-.002z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {t("scriePeViber")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t("viberDesc")}
                      </p>
                    </div>
                    <svg
                      className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                      />
                    </svg>
                  </a>

                  <a
                    href={MAPS_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-4 bg-white border border-border p-5 hover:border-foreground/20 transition-colors duration-300"
                  >
                    <div className="shrink-0 w-10 h-10 flex items-center justify-center bg-foreground/8 text-foreground/60">
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z"
                        />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {t("cumAjungi")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t("cumAjungiDesc")}
                      </p>
                    </div>
                    <svg
                      className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                      />
                    </svg>
                  </a>
                </div>

                {/* Emergency box */}
                <div className="mt-6 bg-foreground p-8 lg:p-10">
                  <div className="flex items-start gap-4">
                    <div className="shrink-0 w-10 h-10 flex items-center justify-center bg-white/10">
                      <svg
                        className="w-5 h-5 text-red-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                        />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-white font-semibold text-sm mb-1">
                        {t("urgenteDentare")}
                      </h3>
                      <p className="text-white/60 text-sm leading-relaxed mb-4">
                        {t("urgenteDesc")}
                      </p>
                      <a
                        href="tel:+37379950008"
                        className="inline-flex items-center gap-2 text-sm font-medium text-white hover:text-accent transition-colors"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={2}
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"
                          />
                        </svg>
                        +373 799 500 08
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── MAP ── */}
      <section className="relative">
        <div className="aspect-[16/7] w-full">
          <iframe
            src={MAPS_EMBED}
            width="100%"
            height="100%"
            style={{ border: 0, filter: "saturate(0.85) contrast(1.05)" }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title={t("iframeTitle")}
          />
        </div>
        {/* Overlay card */}
        <div className="absolute bottom-6 left-6 lg:bottom-10 lg:left-10 z-10 bg-white border border-border p-6 max-w-xs shadow-xl">
          <h3 className="font-serif text-lg font-medium text-foreground mb-2">
            {t("mapCardTitle")}
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            {t("mapCardAddress")}
          </p>
          <a
            href={MAPS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium text-foreground hover:text-accent transition-colors"
          >
            {t("deschideGoogleMaps")}
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
              />
            </svg>
          </a>
        </div>
      </section>
    </>
  );
}
