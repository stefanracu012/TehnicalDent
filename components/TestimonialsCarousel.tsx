"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";

interface Testimonial {
  id: string;
  name: string;
  content: string;
  service?: string | null;
}

interface Props {
  testimonials: Testimonial[];
  autoInterval?: number;
}

const AVATAR_COLORS = [
  "bg-sky-900",
  "bg-stone-700",
  "bg-zinc-800",
  "bg-slate-700",
];

const AVATAR_PHOTOS = [
  "/images/testimonials/patient-1.jpg",
  "/images/testimonials/patient-2.jpg",
  "/images/testimonials/patient-3.jpg",
];

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function TestimonialsCarousel({
  testimonials,
  autoInterval = 7000,
}: Props) {
  const t = useTranslations("Testimonials");
  const [current, setCurrent] = useState(0);
  const [visible, setVisible] = useState(true);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);

  const goTo = useCallback(
    (index: number) => {
      if (index === current) return;
      setVisible(false);
      setTimeout(() => {
        setCurrent(index);
        setProgress(0);
        setVisible(true);
      }, 350);
    },
    [current],
  );

  const goNext = useCallback(() => {
    goTo((current + 1) % testimonials.length);
  }, [current, testimonials.length, goTo]);

  // Auto-advance
  useEffect(() => {
    if (paused) return;
    const t = setTimeout(goNext, autoInterval);
    return () => clearTimeout(t);
  }, [current, paused, goNext, autoInterval]);

  // rAF progress bar
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

  if (!testimonials.length) return null;
  const item = testimonials[current];

  return (
    <div
      className="relative overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* ── Background decorative elements ──────────────── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Giant faded quote mark */}
        <svg
          className="absolute -top-6 -left-4 w-64 h-64 text-foreground/[0.04] select-none"
          fill="currentColor"
          viewBox="0 0 100 100"
        >
          <path d="M0 50 Q0 10 40 10 L40 30 Q20 30 20 50 L40 50 L40 90 L0 90 Z" />
          <path d="M55 50 Q55 10 95 10 L95 30 Q75 30 75 50 L95 50 L95 90 L55 90 Z" />
        </svg>
        {/* Horizontal accent line */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      </div>

      <div className="relative max-w-5xl mx-auto px-6 lg:px-8 py-20 lg:py-28">
        {/* ── Header label ────────────────────────────────── */}
        <div className="flex items-center gap-4 mb-14">
          <div className="h-px w-10 bg-accent" />
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">
            {t("label")}
          </p>
        </div>

        {/* ── Main quote area ──────────────────────────────── */}
        <div
          className="transition-all duration-350 ease-out"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(12px)",
          }}
        >
          {/* Stars */}
          <div className="flex items-center gap-1 mb-8">
            {Array.from({ length: 5 }).map((_, i) => (
              <svg
                key={i}
                className="w-5 h-5 text-amber-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
          </div>

          {/* Quote text */}
          <blockquote>
            <p className="font-serif text-2xl md:text-3xl lg:text-[2rem] font-medium leading-[1.45] text-foreground tracking-tight max-w-3xl">
              &ldquo;{item.content}&rdquo;
            </p>
          </blockquote>

          {/* Author */}
          <div className="mt-10 flex items-center gap-4">
            {/* Avatar */}
            <div className="w-14 h-14 flex-shrink-0 overflow-hidden rounded-full ring-2 ring-border">
              {AVATAR_PHOTOS[current] ? (
                <Image
                  src={AVATAR_PHOTOS[current]}
                  alt={item.name}
                  width={56}
                  height={56}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div
                  className={`w-full h-full flex items-center justify-center text-white font-semibold text-sm ${AVATAR_COLORS[current % AVATAR_COLORS.length]}`}
                >
                  {initials(item.name)}
                </div>
              )}
            </div>
            <div>
              <p className="font-semibold text-foreground text-base">
                {item.name}
              </p>
              {item.service && (
                <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mt-0.5">
                  {item.service}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── Navigation strip ─────────────────────────────── */}
        <div className="mt-16 flex items-center justify-between">
          {/* Thumbnail buttons */}
          <div className="flex items-center gap-3">
            {testimonials.map((item, i) => (
              <button
                key={item.id}
                onClick={() => goTo(i)}
                className={`group flex items-center gap-2.5 transition-all duration-300 ${
                  i === current ? "opacity-100" : "opacity-35 hover:opacity-65"
                }`}
                aria-label={`Testimonial de la ${item.name}`}
              >
                <div
                  className={`w-9 h-9 flex-shrink-0 overflow-hidden rounded-full ring-1 ring-border transition-all duration-300 ${i === current ? "scale-100" : "scale-90 group-hover:scale-95"}`}
                >
                  {AVATAR_PHOTOS[i] ? (
                    <Image
                      src={AVATAR_PHOTOS[i]}
                      alt={item.name}
                      width={36}
                      height={36}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div
                      className={`w-full h-full flex items-center justify-center text-white text-xs font-semibold ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}
                    >
                      {initials(item.name)}
                    </div>
                  )}
                </div>
                {i === current && (
                  <span className="text-xs font-medium text-foreground hidden sm:block max-w-[120px] truncate">
                    {item.name}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Arrow buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                goTo((current - 1 + testimonials.length) % testimonials.length)
              }
              className="w-11 h-11 flex items-center justify-center border border-border hover:border-foreground hover:bg-foreground hover:text-white transition-all duration-200 text-muted-foreground"
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
              onClick={goNext}
              className="w-11 h-11 flex items-center justify-center border border-border hover:border-foreground hover:bg-foreground hover:text-white transition-all duration-200 text-muted-foreground"
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
          </div>
        </div>
      </div>

      {/* ── Progress bar ────────────────────────────────────── */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-border">
        <div
          className="h-full bg-accent"
          style={{ width: `${progress * 100}%`, transition: "none" }}
        />
      </div>
    </div>
  );
}
