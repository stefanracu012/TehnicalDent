"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";

interface GalleryImage {
  url: string;
  alt: string;
  category?: string;
}

interface GalleryGridProps {
  images: GalleryImage[];
  columns?: 2 | 3 | 4;
  variant?: "masonry" | "uniform";
}

// Aspect ratio patterns to create visual rhythm
const ASPECT_PATTERNS = [
  "aspect-[4/5]",
  "aspect-[4/3]",
  "aspect-[4/3]",
  "aspect-[4/5]",
  "aspect-square",
  "aspect-[4/3]",
  "aspect-[4/3]",
  "aspect-square",
  "aspect-[4/5]",
];

export default function GalleryGrid({
  images,
  columns = 3,
  variant = "masonry",
}: GalleryGridProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [lightboxVisible, setLightboxVisible] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  const openLightbox = useCallback((index: number) => {
    setSelectedIndex(index);
    setImgLoaded(false);
    setLightboxVisible(true);
    document.body.style.overflow = "hidden";
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxVisible(false);
    document.body.style.overflow = "";
    setTimeout(() => setSelectedIndex(null), 300);
  }, []);

  const goNext = useCallback(() => {
    setImgLoaded(false);
    setSelectedIndex((i) => (i !== null ? (i + 1) % images.length : 0));
  }, [images.length]);

  const goPrev = useCallback(() => {
    setImgLoaded(false);
    setSelectedIndex((i) =>
      i !== null ? (i - 1 + images.length) % images.length : 0,
    );
  }, [images.length]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!lightboxVisible) return;
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [lightboxVisible, closeLightbox, goNext, goPrev]);

  // Scroll reveal for each card
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement;
            const delay = Number(el.dataset.delay || 0);
            setTimeout(() => {
              el.style.opacity = "1";
              el.style.transform = "translateY(0) scale(1)";
            }, delay);
            observer.unobserve(el);
          }
        });
      },
      { threshold: 0.05 },
    );

    cardRefs.current.forEach((card) => {
      if (card) observer.observe(card);
    });

    return () => observer.disconnect();
  }, [images]);

  if (variant === "uniform") {
    const gridClass = {
      2: "grid-cols-1 md:grid-cols-2",
      3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
      4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
    }[columns];

    return (
      <>
        <div className={`grid ${gridClass} gap-4`}>
          {images.map((image, index) => (
            <div
              key={index}
              ref={(el) => {
                cardRefs.current[index] = el;
              }}
              data-delay={String((index % (columns * 2)) * 80)}
              className="group relative overflow-hidden cursor-pointer bg-muted aspect-[4/3]"
              style={{
                opacity: 0,
                transform: "translateY(24px) scale(0.98)",
                transition:
                  "opacity 0.65s cubic-bezier(0.22,1,0.36,1), transform 0.65s cubic-bezier(0.22,1,0.36,1)",
              }}
              onClick={() => openLightbox(index)}
            >
              <Image
                src={image.url}
                alt={image.alt}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-400" />
              {image.category && (
                <span className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-sm text-foreground text-xs font-semibold uppercase tracking-widest px-3 py-1 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                  {image.category}
                </span>
              )}
              <div className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center bg-black/60 backdrop-blur-sm text-white opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100 transition-all duration-300">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6"
                  />
                </svg>
              </div>
            </div>
          ))}
        </div>
        <Lightbox
          images={images}
          selectedIndex={selectedIndex}
          visible={lightboxVisible}
          imgLoaded={imgLoaded}
          setImgLoaded={setImgLoaded}
          onClose={closeLightbox}
          onNext={goNext}
          onPrev={goPrev}
        />
      </>
    );
  }

  // Masonry layout (columns CSS)
  const colClass = {
    2: "columns-1 md:columns-2",
    3: "columns-1 sm:columns-2 lg:columns-3",
    4: "columns-1 sm:columns-2 lg:columns-4",
  }[columns];

  return (
    <>
      <div className={colClass} style={{ columnGap: "1rem" }}>
        {images.map((image, index) => {
          return (
            <div
              key={index}
              ref={(el) => {
                cardRefs.current[index] = el;
              }}
              data-delay={String((index % (columns * 2)) * 80)}
              className="group relative overflow-hidden cursor-pointer bg-muted mb-4 break-inside-avoid"
              style={{
                opacity: 0,
                transform: "translateY(24px) scale(0.98)",
                transition:
                  "opacity 0.65s cubic-bezier(0.22,1,0.36,1), transform 0.65s cubic-bezier(0.22,1,0.36,1)",
              }}
              onClick={() => openLightbox(index)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.url}
                alt={image.alt}
                className="w-full h-auto block transition-transform duration-700 group-hover:scale-[1.04]"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-400" />
              {image.category && (
                <span className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-sm text-foreground text-xs font-semibold uppercase tracking-widest px-3 py-1.5 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                  {image.category}
                </span>
              )}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="w-10 h-10 bg-white/90 backdrop-blur-sm flex items-center justify-center scale-75 group-hover:scale-100 transition-transform duration-300">
                  <svg
                    className="w-5 h-5 text-foreground"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="1.5"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6"
                    />
                  </svg>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <Lightbox
        images={images}
        selectedIndex={selectedIndex}
        visible={lightboxVisible}
        imgLoaded={imgLoaded}
        setImgLoaded={setImgLoaded}
        onClose={closeLightbox}
        onNext={goNext}
        onPrev={goPrev}
      />
    </>
  );
}

interface LightboxProps {
  images: GalleryImage[];
  selectedIndex: number | null;
  visible: boolean;
  imgLoaded: boolean;
  setImgLoaded: (v: boolean) => void;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
}

function Lightbox({
  images,
  selectedIndex,
  visible,
  imgLoaded,
  setImgLoaded,
  onClose,
  onNext,
  onPrev,
}: LightboxProps) {
  if (selectedIndex === null) return null;
  const image = images[selectedIndex];

  return (
    <div
      className={`fixed inset-0 z-[999] flex items-center justify-center transition-all duration-300 ${visible ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/95 backdrop-blur-md" />

      {/* Content */}
      <div
        className={`relative z-10 flex flex-col items-center max-w-5xl w-full mx-4 transition-transform duration-300 ${visible ? "scale-100" : "scale-95"}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top bar */}
        <div className="w-full flex items-center justify-between mb-4 px-1">
          <span className="text-white/50 text-xs font-medium uppercase tracking-widest">
            {selectedIndex + 1} / {images.length}
          </span>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-all duration-200"
            aria-label="Închide"
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

        {/* Image container */}
        <div className="relative w-full">
          {!imgLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/5 min-h-[300px]">
              <div className="w-8 h-8 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
            </div>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={selectedIndex}
            src={image.url}
            alt={image.alt}
            onLoad={() => setImgLoaded(true)}
            className={`w-full max-h-[75vh] object-contain transition-opacity duration-300 ${imgLoaded ? "opacity-100" : "opacity-0"}`}
          />

          {/* Nav arrows */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPrev();
            }}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 hover:bg-white/25 backdrop-blur-sm flex items-center justify-center text-white transition-all duration-200 hover:scale-110"
            aria-label="Precedent"
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
          <button
            onClick={(e) => {
              e.stopPropagation();
              onNext();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 hover:bg-white/25 backdrop-blur-sm flex items-center justify-center text-white transition-all duration-200 hover:scale-110"
            aria-label="Următor"
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
        <div className="mt-4 w-full flex items-center justify-between px-1">
          <p className="text-white/70 text-sm">{image.alt}</p>
          {image.category && (
            <span className="text-xs font-semibold uppercase tracking-widest text-accent">
              {image.category}
            </span>
          )}
        </div>

        {/* Dot indicators */}
        <div className="flex items-center gap-2 mt-5">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => setImgLoaded(false)}
              className={`transition-all duration-300 ${i === selectedIndex ? "w-6 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/30 hover:bg-white/60"}`}
              aria-label={`Imaginea ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
