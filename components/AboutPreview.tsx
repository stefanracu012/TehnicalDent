"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

export default function AboutPreview() {
  const t = useTranslations("AboutPreview");
  const imgRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const els = [imgRef.current, textRef.current, badgeRef.current].filter(
      Boolean,
    ) as HTMLElement[];

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).style.opacity = "1";
            (entry.target as HTMLElement).style.transform = "translate(0, 0)";
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 },
    );

    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
      {/* Image side */}
      <div className="relative">
        <div
          ref={imgRef}
          style={{
            opacity: 0,
            transform: "translateX(-32px)",
            transition: "opacity 0.7s ease, transform 0.7s ease",
          }}
        >
          <div className="aspect-[4/3] relative overflow-hidden rounded-xl shadow-xl">
            <Image
              src="/images/about-clinic.jpg"
              alt={t("imgAlt")}
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
            {/* subtle inner vignette */}
            <div className="absolute inset-0 ring-1 ring-inset ring-black/8 rounded-xl pointer-events-none" />
          </div>
        </div>

        {/* Badge 2+ */}
        <div
          ref={badgeRef}
          style={{
            opacity: 0,
            transform: "translate(12px, 12px)",
            transition: "opacity 0.7s ease 0.35s, transform 0.7s ease 0.35s",
          }}
          className="absolute -bottom-6 -right-6 w-44 h-44 bg-white rounded-2xl shadow-lg p-6 hidden lg:flex flex-col justify-center"
        >
          <p className="font-serif text-5xl font-semibold text-foreground leading-none">
            2+
          </p>
          <p className="mt-3 text-xs leading-snug text-muted-foreground">
            {t("badge")}
          </p>
        </div>
      </div>

      {/* Text side */}
      <div
        ref={textRef}
        style={{
          opacity: 0,
          transform: "translateX(32px)",
          transition: "opacity 0.7s ease 0.15s, transform 0.7s ease 0.15s",
        }}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground mb-4">
          {t("subtitle")}
        </p>
        <h2 className="font-serif text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
          {t("title")}
        </h2>
        <div className="mt-6 space-y-4 text-muted-foreground leading-relaxed">
          <p>{t("p1")}</p>
          <p>{t("p2")}</p>
        </div>

        {/* Stats row */}
        <div className="mt-8 flex gap-8">
          {[
            { value: t("stat1Value"), label: t("stat1Label") },
            { value: t("stat2Value"), label: t("stat2Label") },
            { value: t("stat3Value"), label: t("stat3Label") },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="font-serif text-2xl font-semibold text-foreground">
                {stat.value}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        <Link
          href="/despre"
          className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-foreground group"
        >
          {t("link")}
          <span className="inline-block transition-transform duration-200 group-hover:translate-x-1">
            →
          </span>
        </Link>
      </div>
    </div>
  );
}
