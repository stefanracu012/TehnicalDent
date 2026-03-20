"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

const MAPS_URL =
  "https://www.google.com/maps/place/Tehnical+Dent/@46.9856812,28.8717643,758m/data=!3m2!1e3!4b1!4m6!3m5!1s0x40c979000cb65367:0x895fbc82126b33dc!8m2!3d46.9856776!4d28.8743392!16s%2Fg%2F11xfj0xg_7?entry=ttu";

export default function Footer() {
  const t = useTranslations("Footer");

  const mainNav = [
    { name: t("acasa"), href: "/" as const },
    { name: t("servicii"), href: "/servicii" as const },
    { name: t("despreNoi"), href: "/despre" as const },
    { name: t("galerie"), href: "/galerie" as const },
    { name: t("contact"), href: "/contact" as const },
  ];

  const serviceNav = [
    { name: t("implantologie"), href: "/servicii" as const },
    { name: t("ortodontie"), href: "/servicii" as const },
    { name: t("esteticaDentara"), href: "/servicii" as const },
    { name: t("chirurgieOrala"), href: "/servicii" as const },
    { name: t("pedodontie"), href: "/servicii" as const },
  ];

  return (
    <footer className="bg-foreground text-white">
      <div className="mx-auto max-w-7xl px-6 lg:px-8 pt-16 pb-10 lg:pt-20">
        <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <Link
              href="/"
              className="inline-block font-serif text-2xl font-medium tracking-tight"
            >
              TehnicalDent
            </Link>
            <p className="mt-5 text-sm leading-relaxed text-white/60 max-w-xs">
              {t("brandDescription")}
            </p>
            <div className="mt-8 flex items-center gap-3">
              <a
                href="https://wa.me/37379950008"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp"
                className="w-9 h-9 flex items-center justify-center border border-white/15 text-white/50 hover:border-[#25D366] hover:text-[#25D366] transition-colors duration-200"
              >
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
                </svg>
              </a>
              <a
                href="viber://chat?number=%2B37379950008"
                aria-label="Viber"
                className="w-9 h-9 flex items-center justify-center border border-white/15 text-white/50 hover:border-[#7360F2] hover:text-[#7360F2] transition-colors duration-200"
              >
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M11.4 0C9.473.028 5.333.344 3.02 2.467 1.302 4.187.696 6.7.633 9.817.57 12.933.488 18.776 6.12 20.36h.003l-.004 2.416s-.037.977.61 1.177c.777.242 1.234-.5 1.98-1.302.407-.44.972-1.084 1.397-1.58 3.85.326 6.812-.416 7.15-.525.776-.252 5.176-.816 5.892-6.657.74-6.02-.36-9.83-2.34-11.546-.596-.55-3.006-2.3-8.375-2.323 0 0-.395-.025-1.037-.017zm.058 1.693c.545-.004.88.017.88.017 4.542.02 6.717 1.388 7.222 1.846 1.675 1.435 2.53 4.868 1.906 9.897v.002c-.604 4.878-4.174 5.184-4.832 5.395-.28.09-2.882.737-6.153.524 0 0-2.436 2.94-3.197 3.704-.12.12-.26.167-.352.144-.13-.033-.166-.188-.165-.414l.02-4.018c-4.762-1.32-4.485-6.292-4.43-8.895.054-2.604.543-4.738 1.996-6.173 1.96-1.773 5.474-2.018 7.11-2.03z" />
                </svg>
              </a>
              <a
                href={MAPS_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Google Maps"
                className="w-9 h-9 flex items-center justify-center border border-white/15 text-white/50 hover:border-red-400 hover:text-red-400 transition-colors duration-200"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"
                  />
                </svg>
              </a>
            </div>
          </div>

          <div className="lg:col-span-2">
            <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-white/40 mb-6">
              {t("navigare")}
            </h3>
            <ul className="space-y-3">
              {mainNav.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className="text-sm text-white/65 hover:text-white transition-colors duration-200"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-3">
            <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-white/40 mb-6">
              {t("servicii")}
            </h3>
            <ul className="space-y-3">
              {serviceNav.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className="text-sm text-white/65 hover:text-white transition-colors duration-200"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-3">
            <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-white/40 mb-6">
              {t("contact")}
            </h3>
            <ul className="space-y-4 text-sm">
              <li className="flex items-start gap-3">
                <svg
                  className="w-4 h-4 mt-0.5 shrink-0 text-white/30"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z"
                  />
                </svg>
                <a
                  href="tel:+37379950008"
                  className="text-white/65 hover:text-white transition-colors duration-200"
                >
                  +373 799 500 08
                </a>
              </li>
              <li className="flex items-start gap-3">
                <svg
                  className="w-4 h-4 mt-0.5 shrink-0 text-white/30"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
                  />
                </svg>
                <a
                  href="mailto:tehnicaldentmd@gmail.com"
                  className="text-white/65 hover:text-white transition-colors duration-200 break-all"
                >
                  tehnicaldentmd@gmail.com
                </a>
              </li>
              <li className="flex items-start gap-3">
                <svg
                  className="w-4 h-4 mt-0.5 shrink-0 text-white/30"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"
                  />
                </svg>
                <a
                  href={MAPS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/65 hover:text-white transition-colors duration-200"
                >
                  Str. Sarmizegetusa 24/1, Chișinău
                </a>
              </li>
              <li className="flex items-start gap-3 pt-1">
                <svg
                  className="w-4 h-4 mt-0.5 shrink-0 text-white/30"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                  />
                </svg>
                <div className="text-white/65 leading-relaxed">
                  <span className="block">{t("programLuniVineri")}</span>
                  <span className="block">{t("programSambata")}</span>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto max-w-7xl px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-white/35">
            &copy; {new Date().getFullYear()} {t("copyright")}
          </p>
          <div className="flex items-center gap-6 text-xs text-white/35">
            <Link
              href="/politica-confidentialitate"
              className="hover:text-white/70 transition-colors duration-200"
            >
              {t("politicaConf")}
            </Link>
            <span>·</span>
            <Link
              href="/termeni"
              className="hover:text-white/70 transition-colors duration-200"
            >
              {t("termeniConditii")}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
