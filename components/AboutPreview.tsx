"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

export interface AboutPreviewOverrides {
  image?: string;
  years?: string;
  badge?: string;
  subtitle?: string;
  title?: string;
  p1?: string;
  p2?: string;
  stat1Value?: string;
  stat1Label?: string;
  stat2Value?: string;
  stat2Label?: string;
  stat3Value?: string;
  stat3Label?: string;
  link?: string;
}

export default function AboutPreview({
  overrides: initialOverrides = {},
  noFetch = false,
}: {
  overrides?: AboutPreviewOverrides;
  noFetch?: boolean;
}) {
  const t = useTranslations("AboutPreview");
  const imgRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);
  const [overrides, setOverrides] =
    useState<AboutPreviewOverrides>(initialOverrides);

  // When used in admin (noFetch=true), sync state from props as they change live
  useEffect(() => {
    if (noFetch) setOverrides(initialOverrides);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noFetch, JSON.stringify(initialOverrides)]);

  // Fetch fresh settings client-side to always reflect latest admin changes
  useEffect(() => {
    if (noFetch) return;
    fetch("/api/public/settings")
      .then((r) => r.json())
      .then((data: Record<string, string>) => {
        setOverrides({
          image: data["aboutPreviewImage"] || undefined,
          years: data["aboutPreviewYears"] || undefined,
          badge: data["aboutPreviewBadge"] || undefined,
          subtitle: data["aboutPreviewSubtitle"] || undefined,
          title: data["aboutPreviewTitle"] || undefined,
          p1: data["aboutPreviewP1"] || undefined,
          p2: data["aboutPreviewP2"] || undefined,
          stat1Value: data["aboutPreviewStat1Value"] || undefined,
          stat1Label: data["aboutPreviewStat1Label"] || undefined,
          stat2Value: data["aboutPreviewStat2Value"] || undefined,
          stat2Label: data["aboutPreviewStat2Label"] || undefined,
          stat3Value: data["aboutPreviewStat3Value"] || undefined,
          stat3Label: data["aboutPreviewStat3Label"] || undefined,
          link: data["aboutPreviewLink"] || undefined,
        });
      })
      .catch(() => {
        /* keep initial overrides on error */
      });
  }, [noFetch]);

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

  const stats = [
    {
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          className="w-5 h-5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1 1 .03 2.248-1.15 1.658A7.588 7.588 0 0012 18a7.588 7.588 0 00-4.051 1.158c-1.183.59-2.15-.658-1.15-1.658L8.2 16.1"
          />
        </svg>
      ),
      value: overrides.stat1Value || t("stat1Value"),
      label: overrides.stat1Label || t("stat1Label"),
    },
    {
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          className="w-5 h-5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
          />
        </svg>
      ),
      value: overrides.stat2Value || t("stat2Value"),
      label: overrides.stat2Label || t("stat2Label"),
    },
    {
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          className="w-5 h-5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
          />
        </svg>
      ),
      value: overrides.stat3Value || t("stat3Value"),
      label: overrides.stat3Label || t("stat3Label"),
    },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 lg:gap-16 xl:gap-24 items-stretch">
      {/* Image side */}
      <div
        ref={imgRef}
        className="relative"
        style={{
          opacity: 0,
          transform: "translateX(-32px)",
          transition: "opacity 0.7s ease, transform 0.7s ease",
        }}
      >
        {/* Main image */}
        <div className="aspect-square relative overflow-hidden rounded-2xl">
          <Image
            src={overrides.image || "/images/about-clinic.jpg"}
            alt={t("imgAlt")}
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover"
          />
          <div
            className="absolute inset-0 rounded-2xl pointer-events-none"
            style={{
              boxShadow: "inset 0 -180px 120px -10px rgba(116,150,142,1)",
            }}
          />
        </div>

        {/* Floating years badge */}
        <div
          ref={badgeRef}
          className="absolute -bottom-5 -right-5 hidden lg:flex flex-col justify-center w-40 h-40 bg-accent rounded-2xl p-5"
          style={{
            opacity: 0,
            transform: "translate(12px, 12px)",
            transition: "opacity 0.7s ease 0.35s, transform 0.7s ease 0.35s",
            boxShadow: "0 8px 32px 0 rgba(116,150,142,0.45)",
          }}
        >
          <p className="font-serif text-5xl font-semibold text-white leading-none">
            {overrides.years || "2+"}
          </p>
          <p className="mt-2 text-xs leading-snug text-white/80">
            {overrides.badge || t("badge")}
          </p>
        </div>
      </div>

      {/* Text side */}
      <div
        ref={textRef}
        className="flex flex-col justify-center py-4 lg:py-0"
        style={{
          opacity: 0,
          transform: "translateX(32px)",
          transition: "opacity 0.7s ease 0.15s, transform 0.7s ease 0.15s",
        }}
      >
        {/* Eyebrow */}
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent mb-3">
          {overrides.subtitle || t("subtitle")}
        </p>

        {/* Title */}
        <h2 className="font-serif text-3xl sm:text-4xl font-medium text-foreground leading-tight">
          {overrides.title || t("title")}
        </h2>

        {/* Divider */}
        <div className="mt-6 mb-6 h-px w-12 bg-accent/40" />

        {/* Body text */}
        <div className="space-y-4 text-muted-foreground leading-relaxed text-[0.95rem]">
          <p>{overrides.p1 || t("p1")}</p>
          <p>{overrides.p2 || t("p2")}</p>
        </div>

        {/* Feature cards */}
        <div className="mt-8 grid grid-cols-3 gap-3">
          {stats.map((s) => (
            <div
              key={s.label}
              className="flex flex-col gap-2 rounded-xl border border-border bg-background p-4"
            >
              <span className="text-accent">{s.icon}</span>
              <p className="font-serif text-xl font-semibold text-foreground leading-none">
                {s.value}
              </p>
              <p className="text-[0.7rem] text-muted-foreground leading-snug">
                {s.label}
              </p>
            </div>
          ))}
        </div>

        {/* CTA link */}
        <Link
          href="/despre"
          className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-foreground group self-start"
        >
          {overrides.link || t("link")}
          <span className="inline-block transition-transform duration-200 group-hover:translate-x-1">
            →
          </span>
        </Link>
      </div>
    </div>
  );
}
