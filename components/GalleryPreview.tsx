"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import GallerySlideshow from "@/components/GallerySlideshow";

const GALLERY_ITEMS = [
  {
    src: "/images/gallery/clinic-1.jpg",
    alt: "Recepție clinică stomatologică",
    label: "Recepție",
    span: "large", // col-span-2 row-span-2
  },
  {
    src: "/images/gallery/clinic-2.jpg",
    alt: "Cabinet de consultație modern",
    label: "Cabinet",
    span: "normal",
  },
  {
    src: "/images/gallery/clinic-3.jpg",
    alt: "Echipament stomatologic",
    label: "Echipament",
    span: "normal",
  },
  {
    src: "/images/gallery/clinic-4.jpg",
    alt: "Sala de așteptare confortabilă",
    label: "Așteptare",
    span: "wide", // col-span-2
  },
  {
    src: "/images/gallery/clinic-5.jpg",
    alt: "Cabinet de chirurgie",
    label: "Chirurgie",
    span: "normal",
  },
  {
    src: "/images/gallery/clinic-6.jpg",
    alt: "Zonă sterilizare",
    label: "Sterilizare",
    span: "normal",
  },
  {
    src: "/images/gallery/clinic-8.jpg",
    alt: "Cabinet stomatologie pediatrică",
    label: "Pediatrie",
    span: "normal",
  },
  {
    src: "/images/gallery/clinic-9.jpg",
    alt: "Unitate dentară digitală",
    label: "Digital",
    span: "normal",
  },
  {
    src: "/images/gallery/clinic-10.jpg",
    alt: "Masă de lucru sterilizare",
    label: "Sterilizare",
    span: "wide",
  },
  {
    src: "/images/gallery/result-1.jpg",
    alt: "Rezultat tratament estetic",
    label: "Rezultat",
    span: "wide",
  },
];

export default function GalleryPreview() {
  const t = useTranslations("GalleryPreview");
  const sectionRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // Lightbox state
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  const openLightbox = useCallback((index: number) => {
    setSelectedIndex(index);
    setImgLoaded(false);
    setLightboxOpen(true);
    document.body.style.overflow = "hidden";
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxOpen(false);
    document.body.style.overflow = "";
    setTimeout(() => setSelectedIndex(null), 350);
  }, []);

  const goNext = useCallback(() => {
    setImgLoaded(false);
    setSelectedIndex((i) => (i !== null ? (i + 1) % GALLERY_ITEMS.length : 0));
  }, []);

  const goPrev = useCallback(() => {
    setImgLoaded(false);
    setSelectedIndex((i) =>
      i !== null ? (i - 1 + GALLERY_ITEMS.length) % GALLERY_ITEMS.length : 0,
    );
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!lightboxOpen) return;
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [lightboxOpen, closeLightbox, goNext, goPrev]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 },
    );

    const cards = sectionRef.current?.querySelectorAll("[data-gallery-card]");
    if (headingRef.current) observer.observe(headingRef.current);
    if (gridRef.current) observer.observe(gridRef.current);
    cards?.forEach((card) => observer.observe(card));

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={sectionRef} className="relative overflow-hidden">
      {/* ── AUTO SLIDESHOW ── */}
      <GallerySlideshow
        items={GALLERY_ITEMS}
        autoInterval={5000}
        onOpen={openLightbox}
        className="h-[52vh] md:h-[65vh] mb-14"
      />

      {/* Heading row */}
      <div
        ref={headingRef}
        className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12
          opacity-0 translate-y-10 transition-all duration-700 ease-out
          [.in-view_&]:opacity-100 [.in-view_&]:translate-y-0"
        style={{ transitionDelay: "0ms" }}
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent mb-3">
            {t("subtitle")}
          </p>
          <h2 className="font-serif text-3xl font-medium tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            {t("title")}
            <br />
            <span className="italic font-normal">{t("titleAccent")}</span>
          </h2>
        </div>
        <p className="text-muted-foreground max-w-sm leading-relaxed text-sm md:text-base md:text-right">
          {t("description")}
        </p>
      </div>

      {/* Asymmetric mosaic grid */}
      <div
        ref={gridRef}
        className="grid grid-cols-2 md:grid-cols-4 grid-rows-[auto] gap-3 md:gap-4"
      >
        {/* Item 1 — large (2×2) */}
        <GalleryCard
          item={GALLERY_ITEMS[0]}
          className="col-span-2 row-span-2 md:h-[480px] h-[280px]"
          delay={0}
          onOpen={() => openLightbox(0)}
        />

        {/* Item 2 — top-right */}
        <GalleryCard
          item={GALLERY_ITEMS[1]}
          className="col-span-1 md:col-span-1 h-[180px] md:h-[232px]"
          delay={80}
          onOpen={() => openLightbox(1)}
        />

        {/* Item 3 — top-right */}
        <GalleryCard
          item={GALLERY_ITEMS[2]}
          className="col-span-1 md:col-span-1 h-[180px] md:h-[232px]"
          delay={160}
          onOpen={() => openLightbox(2)}
        />

        {/* Item 4 — bottom-right wide */}
        <GalleryCard
          item={GALLERY_ITEMS[3]}
          className="col-span-2 md:col-span-2 h-[180px] md:h-[232px]"
          delay={240}
          onOpen={() => openLightbox(3)}
        />

        {/* Row 3 — full 4 columns */}
        <GalleryCard
          item={GALLERY_ITEMS[4]}
          className="col-span-1 h-[180px] md:h-[220px]"
          delay={320}
          onOpen={() => openLightbox(4)}
        />
        <GalleryCard
          item={GALLERY_ITEMS[5]}
          className="col-span-1 h-[180px] md:h-[220px]"
          delay={400}
          onOpen={() => openLightbox(5)}
        />
        <GalleryCard
          item={GALLERY_ITEMS[6]}
          className="col-span-1 h-[180px] md:h-[220px]"
          delay={480}
          onOpen={() => openLightbox(6)}
        />
        <GalleryCard
          item={GALLERY_ITEMS[7]}
          className="col-span-1 h-[180px] md:h-[220px]"
          delay={560}
          onOpen={() => openLightbox(7)}
        />

        {/* Row 4 — two wide */}
        <GalleryCard
          item={GALLERY_ITEMS[8]}
          className="col-span-2 h-[180px] md:h-[220px]"
          delay={640}
          onOpen={() => openLightbox(8)}
        />
        <GalleryCard
          item={GALLERY_ITEMS[9]}
          className="col-span-2 h-[180px] md:h-[220px]"
          delay={720}
          onOpen={() => openLightbox(9)}
        />
      </div>

      {/* CTA row */}
      <div className="mt-10 flex items-center justify-between">
        <div className="h-px flex-1 bg-gradient-to-r from-border to-transparent" />
        <Link
          href="/galerie"
          className="group ml-8 inline-flex items-center gap-3 text-sm font-semibold uppercase tracking-widest text-foreground hover:text-accent transition-colors duration-300"
        >
          <span>{t("veziGaleriaCompleta")}</span>
          <span className="w-8 h-px bg-foreground group-hover:bg-accent group-hover:w-14 transition-all duration-300" />
          <svg
            className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300"
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

      {/* ─── LIGHTBOX ─────────────────────────────────────── */}
      {selectedIndex !== null && (
        <div
          className={`fixed inset-0 z-[999] flex items-center justify-center transition-all duration-350 ${
            lightboxOpen
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          }`}
          onClick={closeLightbox}
        >
          {/* Blurred backdrop */}
          <div className="absolute inset-0 bg-black/92 backdrop-blur-lg" />

          {/* Content box */}
          <div
            className={`relative z-10 flex flex-col items-center w-full max-w-5xl mx-4 transition-all duration-350 ${
              lightboxOpen
                ? "scale-100 translate-y-0"
                : "scale-95 translate-y-4"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top bar */}
            <div className="w-full flex items-center justify-between mb-5 px-1">
              <div className="flex items-center gap-3">
                <span className="text-white/40 text-xs font-medium uppercase tracking-[0.2em]">
                  {selectedIndex + 1} / {GALLERY_ITEMS.length}
                </span>
                <span className="text-white/20 text-xs">—</span>
                <span className="text-white/60 text-xs">
                  {GALLERY_ITEMS[selectedIndex].label}
                </span>
              </div>
              <button
                onClick={closeLightbox}
                className="w-9 h-9 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all duration-200"
                aria-label={t("inchide")}
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Image */}
            <div className="relative w-full flex items-center justify-center">
              {/* Spinner */}
              {!imgLoaded && (
                <div className="absolute inset-0 flex items-center justify-center min-h-[260px]">
                  <div className="w-8 h-8 border-2 border-white/15 border-t-white/70 rounded-full animate-spin" />
                </div>
              )}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                key={selectedIndex}
                src={GALLERY_ITEMS[selectedIndex].src}
                alt={GALLERY_ITEMS[selectedIndex].alt}
                onLoad={() => setImgLoaded(true)}
                className={`w-full max-h-[72vh] object-contain transition-opacity duration-400 ${
                  imgLoaded ? "opacity-100" : "opacity-0"
                }`}
              />

              {/* Prev arrow */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  goPrev();
                }}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-11 h-11 bg-white/8 hover:bg-white/20 backdrop-blur-sm flex items-center justify-center text-white transition-all duration-200 hover:scale-110 border border-white/10 hover:border-white/30"
                aria-label={t("precedent")}
              >
                <svg
                  className="w-5 h-5"
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

              {/* Next arrow */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  goNext();
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-11 h-11 bg-white/8 hover:bg-white/20 backdrop-blur-sm flex items-center justify-center text-white transition-all duration-200 hover:scale-110 border border-white/10 hover:border-white/30"
                aria-label={t("urmator")}
              >
                <svg
                  className="w-5 h-5"
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
            </div>

            {/* Caption */}
            <p className="mt-4 text-white/50 text-sm text-center px-4">
              {GALLERY_ITEMS[selectedIndex].alt}
            </p>

            {/* Dot strip */}
            <div className="flex items-center gap-1.5 mt-5">
              {GALLERY_ITEMS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setImgLoaded(false);
                    setSelectedIndex(i);
                  }}
                  className={`transition-all duration-300 rounded-full ${
                    i === selectedIndex
                      ? "w-5 h-1.5 bg-white rounded-full"
                      : "w-1.5 h-1.5 bg-white/25 hover:bg-white/50"
                  }`}
                  aria-label={`Imaginea ${i + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface GalleryCardProps {
  item: (typeof GALLERY_ITEMS)[0];
  className?: string;
  delay?: number;
  onOpen?: () => void;
}

function GalleryCard({
  item,
  className = "",
  delay = 0,
  onOpen,
}: GalleryCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            el.style.opacity = "1";
            el.style.transform = "translateY(0) scale(1)";
          }, delay);
          observer.unobserve(el);
        }
      },
      { threshold: 0.05 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [delay]);

  return (
    <div
      ref={cardRef}
      data-gallery-card
      className={`gallery-card group relative overflow-hidden bg-muted cursor-pointer ${className}`}
      onClick={onOpen}
      style={{
        opacity: 0,
        transform: "translateY(30px) scale(0.97)",
        transition:
          "opacity 0.7s cubic-bezier(0.22,1,0.36,1), transform 0.7s cubic-bezier(0.22,1,0.36,1)",
      }}
    >
      <Image
        src={item.src}
        alt={item.alt}
        fill
        sizes="(max-width: 768px) 50vw, 25vw"
        className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
      />

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      {/* Label chip */}
      <div className="absolute bottom-3 left-3 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-400 ease-out">
        <span className="inline-block bg-white/95 backdrop-blur-sm text-foreground text-xs font-semibold uppercase tracking-widest px-3 py-1.5">
          {item.label}
        </span>
      </div>

      {/* Corner expand icon */}
      <div className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center bg-white/90 backdrop-blur-sm opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100 transition-all duration-300">
        <svg
          className="w-4 h-4 text-foreground"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.5"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"
          />
        </svg>
      </div>
    </div>
  );
}
