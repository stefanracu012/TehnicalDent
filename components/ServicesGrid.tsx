"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

interface Service {
  slug: string;
  title: string;
  shortDesc: string;
  images: string[];
  category: string;
}

export default function ServicesGrid({ services }: { services: Service[] }) {
  const router = useRouter();
  const t = useTranslations("Services");

  // Build unique categories from services data (category is already localized)
  const categoryMap = new Map<string, string>();
  services.forEach((s) => {
    if (!categoryMap.has(s.category)) {
      categoryMap.set(s.category, s.category);
    }
  });

  const [active, setActive] = useState("Toate");
  const gridRef = useRef<HTMLDivElement>(null);

  const filtered =
    active === "Toate"
      ? services
      : services.filter((s) => s.category === active);

  // Fade-in on scroll
  useEffect(() => {
    const cards = gridRef.current?.querySelectorAll<HTMLElement>("[data-card]");
    if (!cards) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).style.opacity = "1";
            (entry.target as HTMLElement).style.transform = "translateY(0)";
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -30px 0px" },
    );
    cards.forEach((c) => observer.observe(c));
    return () => observer.disconnect();
  }, [filtered]);

  return (
    <div>
      {/* ── Filter tabs ── */}
      <div className="flex flex-wrap gap-2 mb-10">
        <button
          onClick={() => setActive("Toate")}
          className={`px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
            active === "Toate"
              ? "bg-foreground text-white shadow-sm"
              : "bg-muted text-muted-foreground hover:bg-border hover:text-foreground"
          }`}
        >
          {t("filtrulToate")}
        </button>
        {Array.from(categoryMap.entries()).map(
          ([originalCat, translatedCat]) => (
            <button
              key={originalCat}
              onClick={() => setActive(originalCat)}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                active === originalCat
                  ? "bg-foreground text-white shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-border hover:text-foreground"
              }`}
            >
              {translatedCat}
            </button>
          ),
        )}
      </div>

      {/* ── Grid ── */}
      <div
        ref={gridRef}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
      >
        {filtered.map((service, index) => (
          <div
            key={service.slug}
            data-card
            onClick={() => router.push(`/servicii/${service.slug}`)}
            className="group relative overflow-hidden rounded-2xl cursor-pointer h-[280px]"
            style={{
              opacity: 0,
              transform: "translateY(20px)",
              transition: `opacity 0.5s ease ${index * 50}ms, transform 0.5s ease ${index * 50}ms`,
            }}
          >
            {/* Image */}
            <Image
              src={`/images/services/${service.slug}.jpg`}
              alt={service.title}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-110 will-change-transform"
            />

            {/* Gradients */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/0" />
            <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            {/* Content */}
            <div className="absolute inset-x-0 bottom-0 p-5 z-10">
              <span className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-white/50 mb-1.5">
                {service.category}
              </span>
              <h3 className="font-serif text-lg font-medium text-white leading-snug">
                {service.title}
              </h3>

              {/* Revealed on hover */}
              <div className="overflow-hidden max-h-0 group-hover:max-h-[160px] transition-all duration-500 ease-out">
                <p className="text-white/70 text-xs leading-relaxed mt-2 line-clamp-2">
                  {service.shortDesc}
                </p>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(
                        `/contact?serviciu=${encodeURIComponent(service.title)}#formular`,
                      );
                    }}
                    className="inline-flex items-center bg-accent text-white text-xs font-semibold px-3.5 py-1.5 rounded-full hover:bg-accent/90 transition-colors"
                  >
                    {t("programeaza")}
                  </button>
                  <span className="inline-flex items-center bg-white/15 backdrop-blur-sm border border-white/20 text-white text-xs font-semibold px-3.5 py-1.5 rounded-full">
                    {t("veziDetalii")}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
