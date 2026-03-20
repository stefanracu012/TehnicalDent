"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { useState, useRef, useEffect } from "react";

/* Inline SVG flag icons – consistent across all platforms */
function FlagRO({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 16"
      className={
        className ??
        "w-5 h-3.5 rounded-[1px] shadow-[0_0_0_0.5px_rgba(0,0,0,0.08)]"
      }
    >
      <rect width="8" height="16" fill="#002B7F" />
      <rect x="8" width="8" height="16" fill="#FCD116" />
      <rect x="16" width="8" height="16" fill="#CE1126" />
    </svg>
  );
}
function FlagEN({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 60 30"
      className={
        className ??
        "w-5 h-3.5 rounded-[1px] shadow-[0_0_0_0.5px_rgba(0,0,0,0.08)]"
      }
    >
      <clipPath id="ls">
        <path d="M0,0 v30 h60 v-30 z" />
      </clipPath>
      <clipPath id="lt">
        <path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z" />
      </clipPath>
      <g clipPath="url(#ls)">
        <path d="M0,0 v30 h60 v-30 z" fill="#012169" />
        <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" />
        <path
          d="M0,0 L60,30 M60,0 L0,30"
          clipPath="url(#lt)"
          stroke="#C8102E"
          strokeWidth="4"
        />
        <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10" />
        <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6" />
      </g>
    </svg>
  );
}
function FlagRU({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 16"
      className={
        className ??
        "w-5 h-3.5 rounded-[1px] shadow-[0_0_0_0.5px_rgba(0,0,0,0.08)]"
      }
    >
      <rect width="24" height="5.33" fill="#fff" />
      <rect y="5.33" width="24" height="5.33" fill="#0039A6" />
      <rect y="10.67" width="24" height="5.33" fill="#D52B1E" />
    </svg>
  );
}
function FlagIT({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 16"
      className={
        className ??
        "w-5 h-3.5 rounded-[1px] shadow-[0_0_0_0.5px_rgba(0,0,0,0.08)]"
      }
    >
      <rect width="8" height="16" fill="#009246" />
      <rect x="8" width="8" height="16" fill="#fff" />
      <rect x="16" width="8" height="16" fill="#CE2B37" />
    </svg>
  );
}

const localeFlags: Record<
  string,
  ({ className }: { className?: string }) => React.JSX.Element
> = {
  ro: FlagRO,
  en: FlagEN,
  ru: FlagRU,
  it: FlagIT,
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
        <span className={`inline-flex items-center ${dark ? "" : ""}`}>
          {(() => {
            const Flag = localeFlags[locale];
            return Flag ? <Flag /> : null;
          })()}
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
              <span className="inline-flex items-center">
                {(() => {
                  const Flag = localeFlags[l];
                  return Flag ? <Flag /> : null;
                })()}
              </span>
              <span>{t(l as "ro" | "en" | "ru" | "it")}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
