"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import GalleryGrid from "@/components/GalleryGrid";

interface GalleryImage {
  url: string;
  alt: string;
  category?: string;
}

interface Props {
  images: GalleryImage[];
}

export default function GalleryClient({ images }: Props) {
  const t = useTranslations("Gallery");
  const tNav = useTranslations("Nav");

  // Build categories dynamically from images (already localized)
  const uniqueCategories = Array.from(
    new Set(images.map((img) => img.category).filter(Boolean)),
  ) as string[];

  const STATS = [
    { value: "6", label: t("statCabinete") },
    { value: "3D", label: t("statTomograf") },
    { value: "2+", label: t("statAni") },
    { value: "100%", label: t("statSterilizare") },
  ];

  const [activeCategory, setActiveCategory] = useState("Toate");
  const [heroSlide, setHeroSlide] = useState(0);
  const heroRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const autoKey = useRef(0); // bump to reset auto-timer

  const slideCount = Math.min(images.length, 10);

  const filtered =
    activeCategory === "Toate"
      ? images
      : images.filter((img) => img.category === activeCategory);

  const goNext = useCallback(() => {
    setHeroSlide((prev) => (prev + 1) % slideCount);
  }, [slideCount]);

  const goPrev = useCallback(() => {
    setHeroSlide((prev) => (prev - 1 + slideCount) % slideCount);
  }, [slideCount]);

  // Auto-cycle hero background images
  useEffect(() => {
    if (slideCount === 0) return;
    const interval = setInterval(goNext, 4500);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goNext, autoKey.current]);

  // Touch & mouse drag handlers
  const handleDragStart = useCallback((clientX: number, clientY: number) => {
    dragStart.current = { x: clientX, y: clientY };
  }, []);

  const handleDragEnd = useCallback(
    (clientX: number) => {
      if (!dragStart.current) return;
      const dx = clientX - dragStart.current.x;
      if (Math.abs(dx) > 50) {
        if (dx < 0) goNext();
        else goPrev();
        autoKey.current++;
      }
      dragStart.current = null;
    },
    [goNext, goPrev],
  );

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.querySelectorAll("[data-reveal]").forEach((el, i) => {
              setTimeout(() => {
                (el as HTMLElement).style.opacity = "1";
                (el as HTMLElement).style.transform = "translateY(0)";
              }, i * 100);
            });
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 },
    );
    if (statsRef.current) observer.observe(statsRef.current);
    if (gridRef.current) observer.observe(gridRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      {/* ─── HERO ──────────────────────────────────────────────────────── */}
      <section
        ref={heroRef}
        className="relative min-h-[70vh] flex items-end pt-[11rem] overflow-hidden select-none"
        onMouseDown={(e) => handleDragStart(e.clientX, e.clientY)}
        onMouseUp={(e) => handleDragEnd(e.clientX)}
        onMouseLeave={() => {
          dragStart.current = null;
        }}
        onTouchStart={(e) =>
          handleDragStart(e.touches[0].clientX, e.touches[0].clientY)
        }
        onTouchEnd={(e) => handleDragEnd(e.changedTouches[0].clientX)}
      >
        {/* BG slideshow */}
        <div className="absolute inset-0">
          {images.slice(0, 10).map((img, i) => (
            <Image
              key={img.url}
              src={img.url}
              alt={img.alt}
              fill
              sizes="100vw"
              priority={i === 0}
              className={`object-cover transition-opacity duration-[1.5s] ease-in-out ${
                i === heroSlide ? "opacity-100" : "opacity-0"
              }`}
              style={{ filter: "saturate(0.75) brightness(0.55)" }}
              draggable={false}
            />
          ))}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-black/5" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/35 to-transparent" />
        </div>

        {/* Arrows */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            goPrev();
            autoKey.current++;
          }}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-30 w-11 h-11 flex items-center justify-center text-white bg-black/25 hover:bg-black/60 backdrop-blur-sm border border-white/10 hover:border-white/35 opacity-0 hover:opacity-100 lg:group-hover:opacity-100 transition-all duration-300 cursor-pointer"
          style={{ opacity: 0.5 }}
          aria-label={t("precedent")}
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="2"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 19.5L8.25 12l7.5-7.5"
            />
          </svg>
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            goNext();
            autoKey.current++;
          }}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-30 w-11 h-11 flex items-center justify-center text-white bg-black/25 hover:bg-black/60 backdrop-blur-sm border border-white/10 hover:border-white/35 opacity-0 hover:opacity-100 lg:group-hover:opacity-100 transition-all duration-300 cursor-pointer"
          style={{ opacity: 0.5 }}
          aria-label={t("urmator")}
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="2"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8.25 4.5l7.5 7.5-7.5 7.5"
            />
          </svg>
        </button>

        {/* Dot indicators */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2">
          {images.slice(0, 10).map((_, i) => (
            <button
              key={i}
              onClick={() => {
                setHeroSlide(i);
                autoKey.current++;
              }}
              className={`transition-all duration-300 rounded-full ${
                i === heroSlide
                  ? "w-6 h-2 bg-white"
                  : "w-2 h-2 bg-white/40 hover:bg-white/70"
              }`}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>

        {/* Hero content */}
        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 lg:px-8 pb-16 lg:pb-24 pointer-events-none">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-white/50 text-xs uppercase tracking-widest mb-8 pointer-events-auto">
            <Link href="/" className="hover:text-white transition-colors">
              {tNav("acasa")}
            </Link>
            <span>/</span>
            <span className="text-white/80">{t("heroTitle")}</span>
          </nav>

          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent mb-5">
              {t("heroSubtitle")}
            </p>
            <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl font-medium text-white leading-[1.05] tracking-tight">
              {t("heroTitle")}
              <br />
              <span className="italic font-normal text-white/75">
                {t("heroTitleAccent")}
              </span>
            </h1>
            <p className="mt-6 text-white/70 text-lg leading-relaxed max-w-xl">
              {t("heroDescription")}
            </p>
          </div>

          {/* Scroll hint */}
          <div className="mt-12 flex items-center gap-4">
            <div className="w-px h-12 bg-gradient-to-b from-white/50 to-transparent" />
            <span className="text-white/40 text-xs uppercase tracking-widest rotate-0">
              {t("derulati")}
            </span>
          </div>
        </div>
      </section>

      {/* ─── STATS STRIP ───────────────────────────────────────────────── */}
      <section ref={statsRef} className="bg-foreground py-0">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-white/10">
            {STATS.map((stat, i) => (
              <div
                key={i}
                data-reveal
                className="px-6 py-8 text-center"
                style={{
                  opacity: 0,
                  transform: "translateY(20px)",
                  transition: `opacity 0.6s ease ${i * 100}ms, transform 0.6s ease ${i * 100}ms`,
                }}
              >
                <div className="font-serif text-3xl font-medium text-white mb-1">
                  {stat.value}
                </div>
                <div className="text-white/50 text-xs uppercase tracking-widest">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── INTRO + CATEGORY FILTER ───────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 lg:px-8 pt-20 pb-4">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent mb-3">
              {t("completaSubtitle")}
            </p>
            <h2 className="font-serif text-3xl md:text-4xl font-medium text-foreground leading-tight">
              {t("completaTitle")}
              <br />
              <span className="italic font-normal text-muted-foreground">
                {t("completaTitleAccent")}
              </span>
            </h2>
          </div>

          {/* Filter tabs */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveCategory("Toate")}
              className={`px-5 py-2 text-xs font-semibold uppercase tracking-widest transition-all duration-300 ${
                activeCategory === "Toate"
                  ? "bg-foreground text-white"
                  : "bg-muted text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
              }`}
            >
              {t("categoriiToate")}
            </button>
            {uniqueCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-5 py-2 text-xs font-semibold uppercase tracking-widest transition-all duration-300 ${
                  activeCategory === cat
                    ? "bg-foreground text-white"
                    : "bg-muted text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Thin divider */}
        <div className="mt-8 h-px bg-border" />
      </section>

      {/* ─── MASONRY GALLERY ───────────────────────────────────────────── */}
      <section
        ref={gridRef}
        className="max-w-7xl mx-auto px-6 lg:px-8 py-10 pb-24"
      >
        {filtered.length > 0 ? (
          <GalleryGrid images={filtered} columns={3} variant="masonry" />
        ) : (
          <div className="text-center py-24 text-muted-foreground">
            <p className="text-lg">{t("emptyState")}</p>
          </div>
        )}
      </section>

      {/* ─── EDITORIAL HIGHLIGHT ROW ───────────────────────────────────── */}
      <section className="bg-muted py-20 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
            {/* Text column */}
            <div className="flex flex-col justify-center pr-0 lg:pr-16 py-8 lg:py-0">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent mb-4">
                {t("techSubtitle")}
              </p>
              <h2 className="font-serif text-3xl md:text-4xl font-medium text-foreground mb-6 leading-tight">
                {t("techTitle")}
                <br />
                <span className="italic font-normal">
                  {t("techTitleAccent")}
                </span>
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-8 max-w-md">
                {t("techDescription")}
              </p>
              <ul className="space-y-3 mb-10">
                {[
                  t("techList1"),
                  t("techList2"),
                  t("techList3"),
                  t("techList4"),
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <svg
                      className="w-4 h-4 text-accent mt-0.5 flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="2"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4.5 12.75l6 6 9-13.5"
                      />
                    </svg>
                    <span className="text-sm text-foreground">{item}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/contact"
                className="group self-start inline-flex items-center gap-3 text-sm font-semibold uppercase tracking-widest text-foreground hover:text-accent transition-colors"
              >
                {t("programeazaVizita")}
                <svg
                  className="w-4 h-4 group-hover:translate-x-1 transition-transform"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M17.25 6.75L22.5 12l-5.25 5.25M2.25 12h20.25"
                  />
                </svg>
              </Link>
            </div>

            {/* Image collage column */}
            <div className="grid grid-cols-2 gap-3 h-[500px]">
              <div className="relative overflow-hidden">
                <Image
                  src={images[2]?.url || "/images/gallery/clinic-3.jpg"}
                  alt={images[2]?.alt || "Echipament stomatologic"}
                  fill
                  sizes="(max-width: 1024px) 50vw, 25vw"
                  className="object-cover hover:scale-105 transition-transform duration-700"
                />
              </div>
              <div className="grid grid-rows-2 gap-3">
                <div className="relative overflow-hidden">
                  <Image
                    src={images[4]?.url || "/images/gallery/clinic-5.jpg"}
                    alt={images[4]?.alt || "Cabinet de chirurgie"}
                    fill
                    sizes="(max-width: 1024px) 25vw, 12.5vw"
                    className="object-cover hover:scale-105 transition-transform duration-700"
                  />
                </div>
                <div className="relative overflow-hidden">
                  <Image
                    src={images[5]?.url || "/images/gallery/clinic-6.jpg"}
                    alt={images[5]?.alt || "Zonă sterilizare"}
                    fill
                    sizes="(max-width: 1024px) 25vw, 12.5vw"
                    className="object-cover hover:scale-105 transition-transform duration-700"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── RESULTS SPOTLIGHT ─────────────────────────────────────────── */}
      {images.some((img) => img.category === "Rezultate") && (
        <section className="max-w-7xl mx-auto px-6 lg:px-8 py-20">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent mb-3">
                {t("rezultateSubtitle")}
              </p>
              <h2 className="font-serif text-3xl font-medium text-foreground">
                {t("rezultateTitle")}
              </h2>
            </div>
            <p className="text-muted-foreground text-sm max-w-xs md:text-right">
              {t("rezultateDescription")}
            </p>
          </div>
          <GalleryGrid
            images={images.filter((img) => img.category === "Rezultate")}
            columns={3}
            variant="uniform"
          />
        </section>
      )}

      {/* ─── CTA SECTION ───────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src={images[1]?.url || "/images/gallery/clinic-2.jpg"}
            alt="Cabinet TechnicalDent"
            fill
            sizes="100vw"
            className="object-cover"
            style={{ filter: "brightness(0.25) saturate(0.4)" }}
          />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 py-24 lg:py-32">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent mb-5">
              {t("ctaSubtitle")}
            </p>
            <h2 className="font-serif text-4xl md:text-5xl font-medium text-white leading-tight mb-6">
              {t("ctaTitle")}
              <br />
              <span className="italic font-normal text-white/70">
                {t("ctaTitleAccent")}
              </span>
            </h2>
            <p className="text-white/60 leading-relaxed mb-10 text-lg">
              {t("ctaDescription")}
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/contact"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-foreground text-sm font-semibold uppercase tracking-widest hover:bg-white/90 transition-colors"
              >
                {t("programeazaAcum")}
              </Link>
              <Link
                href="/despre"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 border border-white/30 text-white text-sm font-semibold uppercase tracking-widest hover:border-white hover:bg-white/10 transition-all"
              >
                {t("despreClinica")}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
