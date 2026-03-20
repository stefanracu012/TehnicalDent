"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface SlideItem {
  src: string;
  alt: string;
  label: string;
}

interface GallerySlideshowProps {
  items: SlideItem[];
  autoInterval?: number;
  onOpen?: (index: number) => void;
  className?: string;
}

export default function GallerySlideshow({
  items,
  autoInterval = 5000,
  onOpen,
  className = "",
}: GallerySlideshowProps) {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);

  const goTo = useCallback((index: number) => {
    setCurrent(index);
    setProgress(0);
  }, []);

  const goNext = useCallback(() => {
    setCurrent((c) => (c + 1) % items.length);
    setProgress(0);
  }, [items.length]);

  const goPrev = useCallback(() => {
    setCurrent((c) => (c - 1 + items.length) % items.length);
    setProgress(0);
  }, [items.length]);

  // Auto-advance
  useEffect(() => {
    if (paused) return;
    const t = setTimeout(goNext, autoInterval);
    return () => clearTimeout(t);
  }, [current, paused, goNext, autoInterval]);

  // rAF-driven progress bar — perfectly smooth
  useEffect(() => {
    cancelAnimationFrame(rafRef.current);
    if (paused) return;
    setProgress(0);
    startRef.current = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - startRef.current) / autoInterval, 1);
      setProgress(p);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [current, paused, autoInterval]);

  if (!items.length) return null;

  return (
    <div
      className={`relative overflow-hidden group/show ${className}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* ── SLIDES ────────────────────────────────────── */}
      {items.map((item, i) => (
        <div
          key={i}
          className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
            i === current ? "opacity-100 z-10" : "opacity-0 z-0"
          }`}
        >
          {/* key trick: forces img remount on activation → Ken Burns restarts */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={i === current ? `a-${current}` : `i-${i}`}
            src={item.src}
            alt={item.alt}
            className={`w-full h-full object-cover ${
              i === current ? "animate-ken-burns" : ""
            }`}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/30 to-transparent" />
        </div>
      ))}

      {/* ── CLICK TO OPEN LIGHTBOX ─────────────────────── */}
      {onOpen && (
        <div
          className="absolute inset-0 z-20 cursor-zoom-in"
          onClick={() => onOpen(current)}
          aria-label="Deschide imaginea mărită"
        />
      )}

      {/* ── COUNTER top-right ──────────────────────────── */}
      <div className="absolute top-5 right-5 z-30 pointer-events-none select-none">
        <span className="font-mono text-xs tabular-nums">
          <span className="text-white/80">
            {String(current + 1).padStart(2, "0")}
          </span>
          <span className="text-white/25 mx-1.5">/</span>
          <span className="text-white/35">
            {String(items.length).padStart(2, "0")}
          </span>
        </span>
      </div>

      {/* ── PAUSE ICON top-left ────────────────────────── */}
      <div
        className={`absolute top-5 left-5 z-30 flex items-center gap-[3px] pointer-events-none select-none transition-opacity duration-200 ${
          paused ? "opacity-70" : "opacity-0"
        }`}
      >
        <div className="w-[3px] h-[14px] bg-white/80 rounded-full" />
        <div className="w-[3px] h-[14px] bg-white/80 rounded-full" />
      </div>

      {/* ── LABEL + CAPTION bottom-left ───────────────── */}
      <div className="absolute bottom-12 left-6 z-30 pointer-events-none select-none">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent mb-1.5">
          {items[current].label}
        </p>
        <p className="text-white/85 text-sm font-medium max-w-xs leading-snug">
          {items[current].alt}
        </p>
      </div>

      {/* ── DOT STRIP bottom-right ────────────────────── */}
      <div className="absolute bottom-[30px] right-5 z-30 flex items-center gap-1.5">
        {items.map((_, i) => (
          <button
            key={i}
            onClick={(e) => {
              e.stopPropagation();
              goTo(i);
            }}
            className={`transition-all duration-300 rounded-full ${
              i === current
                ? "w-5 h-[5px] bg-white"
                : "w-[5px] h-[5px] bg-white/35 hover:bg-white/65"
            }`}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>

      {/* ── ARROWS (appear on hover) ──────────────────── */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          goPrev();
        }}
        className="absolute left-3 top-1/2 -translate-y-1/2 z-30 w-11 h-11 flex items-center justify-center text-white bg-black/25 hover:bg-black/60 backdrop-blur-sm border border-white/10 hover:border-white/35 opacity-0 group-hover/show:opacity-100 transition-all duration-300 hover:scale-105"
        aria-label="Precedent"
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
        }}
        className="absolute right-3 top-1/2 -translate-y-1/2 z-30 w-11 h-11 flex items-center justify-center text-white bg-black/25 hover:bg-black/60 backdrop-blur-sm border border-white/10 hover:border-white/35 opacity-0 group-hover/show:opacity-100 transition-all duration-300 hover:scale-105"
        aria-label="Următor"
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

      {/* ── PROGRESS BAR (rAF smooth) ──────────────────── */}
      <div className="absolute bottom-0 left-0 right-0 z-30 h-[2px] bg-white/10">
        <div
          className="h-full bg-accent"
          style={{ width: `${progress * 100}%`, transition: "none" }}
        />
      </div>
    </div>
  );
}
