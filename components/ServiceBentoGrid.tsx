"use client";

import { Link } from "@/i18n/navigation";
import { useRouter } from "@/i18n/navigation";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";

interface Service {
  slug: string;
  title: string;
  shortDesc: string;
  images: string[];
  category: string;
  price?: number | null;
  discountPrice?: number | null;
}

type BentoSize = "large" | "wide" | "normal";

const bentoSizes: BentoSize[] = [
  "large", // 0 - implantologie
  "normal", // 1 - ortodontie
  "normal", // 2 - estetica
  "normal", // 3 - chirurgie
  "normal", // 4 - protetica
  "normal", // 5 - endodontie
  "wide", // 6 - parodontologie
  "normal", // 7 - pedodontie
];

export default function ServiceBentoGrid({
  services,
}: {
  services: Service[];
}) {
  const gridRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const t = useTranslations("Services");

  useEffect(() => {
    const cards =
      gridRef.current?.querySelectorAll<HTMLElement>("[data-bento-card]");
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
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" },
    );

    cards.forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={gridRef}
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:[grid-template-rows:240px_240px_270px]"
    >
      {services.slice(0, 8).map((service, index) => {
        const size = bentoSizes[index] ?? "normal";
        const image = service.images?.[0] || `/images/services/${service.slug}.jpg`;

        const colClass =
          size === "large"
            ? "sm:col-span-2 lg:col-span-2"
            : size === "wide"
              ? "sm:col-span-2 lg:col-span-2"
              : "";
        const rowClass = size === "large" ? "lg:row-span-2" : "";
        const heightClass =
          size === "large"
            ? "h-[300px] sm:h-[380px] lg:h-full"
            : "h-[200px] sm:h-[220px] lg:h-full";

        const titleSize = size === "large" ? "text-2xl lg:text-3xl" : "text-lg";
        const descLines = size === "large" ? "line-clamp-4" : "line-clamp-2";

        return (
          <div
            key={service.slug}
            data-bento-card
            onClick={() => router.push(`/servicii/${service.slug}`)}
            className={`group relative overflow-hidden rounded-2xl cursor-pointer ${colClass} ${rowClass} ${heightClass}`}
            style={{
              opacity: 0,
              transform: "translateY(24px)",
              transition: `opacity 0.55s ease ${index * 60}ms, transform 0.55s ease ${index * 60}ms`,
            }}
          >
            {/* Background image */}
            <Image
              src={image}
              alt={service.title}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-110 will-change-transform"
            />

            {/* Base gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-black/5" />

            {/* Hover darkening */}
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            {/* Card content */}
            <div className="absolute inset-x-0 bottom-0 p-5 z-20">
              <span className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-white/50 mb-2">
                {service.category}
              </span>

              <h3
                className={`font-serif font-medium text-white leading-snug ${titleSize}`}
              >
                {service.title}
              </h3>

              {/* Price badge */}
              {service.price != null && (
                <div className="flex items-center gap-2 mt-2">
                  {service.discountPrice != null ? (
                    <>
                      <span className="text-white/50 text-xs line-through">
                        {service.price} MDL
                      </span>
                      <span className="bg-accent text-white text-xs font-bold px-2.5 py-1 rounded-full">
                        {service.discountPrice} MDL
                      </span>
                    </>
                  ) : (
                    <span className="text-white text-sm font-semibold">
                      {t("deLa")} {service.price} MDL
                    </span>
                  )}
                </div>
              )}

              {/* Revealed on hover */}
              <div className="overflow-hidden max-h-0 group-hover:max-h-[200px] transition-all duration-500 ease-out">
                <p
                  className={`text-white/75 text-sm leading-relaxed mt-3 ${descLines}`}
                >
                  {service.shortDesc}
                </p>
                <div className="flex flex-wrap gap-2 mt-4">
                  <Link
                    href={`/contact?serviciu=${encodeURIComponent(service.title)}#formular`}
                    onClick={(e) => e.stopPropagation()}
                    className="relative z-30 inline-flex items-center bg-accent text-white text-xs font-semibold px-4 py-2 rounded-full hover:bg-accent/90 transition-colors"
                  >
                    {t("programeaza")}
                  </Link>
                  <Link
                    href={`/servicii/${service.slug}`}
                    onClick={(e) => e.stopPropagation()}
                    className="relative z-30 inline-flex items-center bg-white/15 backdrop-blur-sm border border-white/20 text-white text-xs font-semibold px-4 py-2 rounded-full hover:bg-white/25 transition-colors"
                  >
                    {t("veziDetalii")}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
