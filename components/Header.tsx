"use client";

import { Link } from "@/i18n/navigation";
import { useState, useRef } from "react";
import { useTranslations } from "next-intl";
import LanguageSwitcher from "@/components/LanguageSwitcher";

const navigationItems = [
  { key: "servicii", href: "/servicii" },
  { key: "despre", href: "/despre" },
  { key: "recomandari", href: "/recomandari" },
  { key: "galerie", href: "/galerie" },
  { key: "contact", href: "/contact" },
] as const;

const megaMenuCategories = [
  {
    categoryKey: "chirurgie",
    items: [
      { name: "Implantologie Dentară", slug: "implantologie" },
      { name: "Chirurgie Orală", slug: "chirurgie-orala" },
    ],
  },
  {
    categoryKey: "estetica",
    items: [
      { name: "Estetică Dentară", slug: "estetica-dentara" },
      { name: "Protetică Dentară", slug: "protetica-dentara" },
    ],
  },
  {
    categoryKey: "ortodontie",
    items: [{ name: "Ortodonție", slug: "ortodontie" }],
  },
  {
    categoryKey: "tratamente",
    items: [
      { name: "Endodonție", slug: "endodontie" },
      { name: "Parodontologie", slug: "parodontologie" },
    ],
  },
  {
    categoryKey: "copii",
    items: [{ name: "Pedodonție", slug: "pedodontie" }],
  },
];

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tNav = useTranslations("Nav");
  const tMega = useTranslations("MegaMenu");

  const openMega = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setMegaOpen(true);
  };
  const closeMega = () => {
    closeTimer.current = setTimeout(() => setMegaOpen(false), 120);
  };

  return (
    <header className="fixed top-9 left-0 right-0 z-40 bg-white/95 backdrop-blur-sm border-b border-border">
      <nav className="mx-auto max-w-7xl px-6 lg:px-8" aria-label="Global">
        <div className="flex h-24 items-center justify-between">
          {/* Logo */}
          <div className="flex lg:flex-1">
            <Link href="/" className="flex items-center gap-3 group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/logo.svg"
                alt="Tehnical Dent logo"
                className="h-20 w-auto transition-opacity duration-200 group-hover:opacity-80"
              />
              <div className="flex flex-col leading-none">
                <span className="font-serif text-xl font-semibold tracking-tight text-foreground group-hover:text-foreground/80 transition-colors">
                  TehnicalDent
                </span>
                <span className="text-[10px] font-medium tracking-[0.18em] uppercase text-foreground/45 mt-[3px]">
                  {tNav("clinicaStomatologica")}
                </span>
              </div>
            </Link>
          </div>

          {/* Mobile menu button — animated hamburger ↔ X */}
          <div className="flex lg:hidden">
            <button
              type="button"
              className="-m-2.5 relative inline-flex items-center justify-center rounded-md p-2.5 text-foreground w-10 h-10"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={tNav("deschideMeniul")}
            >
              <span className="sr-only">{tNav("deschideMeniul")}</span>
              <div className="w-5 h-4 relative flex flex-col justify-between">
                <span
                  className={`block h-[1.5px] w-full bg-foreground rounded-full transition-all duration-300 ease-in-out origin-center ${
                    mobileMenuOpen ? "translate-y-[7.25px] rotate-45" : ""
                  }`}
                />
                <span
                  className={`block h-[1.5px] w-full bg-foreground rounded-full transition-all duration-200 ease-in-out ${
                    mobileMenuOpen ? "opacity-0 scale-x-0" : ""
                  }`}
                />
                <span
                  className={`block h-[1.5px] w-full bg-foreground rounded-full transition-all duration-300 ease-in-out origin-center ${
                    mobileMenuOpen ? "-translate-y-[7.25px] -rotate-45" : ""
                  }`}
                />
              </div>
            </button>
          </div>

          {/* Desktop navigation */}
          <div className="hidden lg:flex lg:gap-x-10">
            {navigationItems.map((item) =>
              item.key === "servicii" ? (
                <div
                  key={item.key}
                  className="relative"
                  onMouseEnter={openMega}
                  onMouseLeave={closeMega}
                >
                  <Link
                    href={item.href}
                    className="text-sm font-medium text-foreground/80 transition-colors duration-200 hover:text-foreground relative group flex items-center gap-1"
                  >
                    {tNav(item.key)}
                    <svg
                      className={`w-3.5 h-3.5 transition-transform duration-200 ${megaOpen ? "rotate-180" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                    <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-foreground transition-all duration-200 group-hover:w-full" />
                  </Link>
                </div>
              ) : (
                <Link
                  key={item.key}
                  href={item.href}
                  className="text-sm font-medium text-foreground/80 transition-colors duration-200 hover:text-foreground relative group"
                >
                  {tNav(item.key)}
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-foreground transition-all duration-200 group-hover:w-full" />
                </Link>
              ),
            )}
          </div>

          {/* CTA Button + Language Switcher */}
          <div className="hidden lg:flex lg:flex-1 lg:justify-end lg:items-center lg:gap-4">
            <Link
              href="/contact"
              className="rounded-none bg-foreground px-6 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:bg-foreground/90 hover:shadow-lg"
            >
              {tNav("programare")}
            </Link>
            <LanguageSwitcher />
          </div>
        </div>

        {/* Mobile menu — animated */}
        <div
          className={`lg:hidden overflow-hidden transition-all duration-300 ease-in-out ${
            mobileMenuOpen ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="pb-6 pt-2">
            <div className="space-y-1">
              {navigationItems.map((item, i) => (
                <Link
                  key={item.key}
                  href={item.href}
                  className="block py-3 text-base font-medium text-foreground/80 transition-all duration-200 hover:text-foreground hover:pl-2"
                  style={{ transitionDelay: mobileMenuOpen ? `${i * 50}ms` : "0ms" }}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {tNav(item.key)}
                </Link>
              ))}
            </div>

            <Link
              href="/contact"
              className="mt-5 block w-full rounded-none bg-foreground px-6 py-3 text-center text-base font-medium text-white transition-colors hover:bg-foreground/90"
              onClick={() => setMobileMenuOpen(false)}
            >
              {tNav("programare")}
            </Link>

            {/* Contact info */}
            <div className="mt-5 pt-5 border-t border-border space-y-3">
              <a
                href="mailto:tehnicaldentmd@gmail.com"
                className="flex items-center gap-3 text-sm text-foreground/70 hover:text-foreground transition-colors"
              >
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                </svg>
                tehnicaldentmd@gmail.com
              </a>
              <a
                href="https://www.google.com/maps/place/Tehnical+Dent/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-sm text-foreground/70 hover:text-foreground transition-colors"
              >
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                </svg>
                Str. Sarmizegetusa 24/1, Chișinău
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* ── MEGA MENU ── */}
      <div
        onMouseEnter={openMega}
        onMouseLeave={closeMega}
        className={`hidden lg:block absolute left-0 right-0 bg-white border-b border-border shadow-xl z-50 transition-all duration-200 origin-top ${
          megaOpen
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 -translate-y-2 pointer-events-none"
        }`}
      >
        <div className="mx-auto max-w-7xl px-6 lg:px-8 py-8">
          <div className="grid grid-cols-5 gap-8">
            {megaMenuCategories.map((group) => (
              <div key={group.categoryKey}>
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-4 pb-2 border-b border-border">
                  {tMega(group.categoryKey)}
                </p>
                <ul className="space-y-1">
                  {group.items.map((item) => (
                    <li key={item.slug}>
                      <Link
                        href={`/servicii/${item.slug}`}
                        onClick={() => setMegaOpen(false)}
                        className="group flex items-center gap-2 py-2 text-sm font-medium text-foreground/75 hover:text-foreground transition-colors duration-150"
                      >
                        <span className="w-1 h-1 rounded-full bg-accent opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            {/* CTA column */}
            <div className="col-span-5 mt-4 pt-5 border-t border-border flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {tMega("nuStiiCeTratament")}{" "}
                <Link
                  href="/contact"
                  onClick={() => setMegaOpen(false)}
                  className="font-semibold text-foreground hover:text-accent transition-colors"
                >
                  {tMega("programeazaConsultatieGratuita")}
                </Link>
              </p>
              <Link
                href="/servicii"
                onClick={() => setMegaOpen(false)}
                className="text-xs font-semibold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
              >
                {tMega("veziToateServiciile")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
