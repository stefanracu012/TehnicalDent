"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { useState, useRef, useEffect } from "react";

const localeFlags: Record<string, string> = {
  ro: "🇷🇴",
  en: "🇬🇧",
  ru: "🇷🇺",
  it: "🇮🇹",
};

export default function LanguageSwitcher({ dark = false }: { dark?: boolean }) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("LanguageSwitcher");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function switchLocale(nextLocale: string) {
    setOpen(false);
    router.replace(pathname, {
      locale: nextLocale as "ro" | "en" | "ru" | "it",
    });
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 font-medium transition-colors cursor-pointer ${
          dark
            ? "text-xs text-white/70 hover:text-white"
            : "text-sm text-foreground/80 hover:text-foreground"
        }`}
        aria-label="Change language"
      >
        <span className={dark ? "text-sm" : "text-base"}>
          {localeFlags[locale]}
        </span>
        <span className={dark ? "inline" : "hidden sm:inline"}>
          {locale.toUpperCase()}
        </span>
        <svg
          className={`${dark ? "w-3 h-3" : "w-3.5 h-3.5"} transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={dark ? 2.5 : 2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-40 rounded-lg border border-border bg-white shadow-lg z-50 overflow-hidden">
          {routing.locales.map((l) => (
            <button
              key={l}
              onClick={() => switchLocale(l)}
              className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors cursor-pointer ${
                l === locale
                  ? "bg-accent/10 text-accent font-medium"
                  : "text-foreground/80 hover:bg-muted"
              }`}
            >
              <span className="text-base">{localeFlags[l]}</span>
              <span>{t(l as "ro" | "en" | "ru" | "it")}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
