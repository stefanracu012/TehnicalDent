"use client";

import Image from "next/image";
import { useState, useEffect, useCallback } from "react";
import Button from "@/components/Button";

const SLIDES = [
  "/images/f9fcff16-2ae0-4969-a4f6-8e2e5d3d7bc0.png",
  "/ae1428f8-acda-4648-8bd0-e14249a94fd2.png",
];

const MOBILE_SLIDES = [
  "/2ffca908-e06d-48dd-8216-cb8538bfebf1.png",
  "/54e81c12-3c06-4060-b140-2db93d4b0529.png",
];

interface HeroSlideshowProps {
  title: string;
  description: string;
  ctaLabel: string;
  servicesLabel: string;
  badge: string;
  imgAlt: string;
}

export default function HeroSlideshow({
  title,
  description,
  ctaLabel,
  servicesLabel,
  badge,
  imgAlt,
}: HeroSlideshowProps) {
  const [current, setCurrent] = useState(0);
  const [animating, setAnimating] = useState(false);

  const goTo = useCallback(
    (index: number) => {
      if (index === current || animating) return;
      setAnimating(true);
      setTimeout(() => {
        setCurrent(index);
        setAnimating(false);
      }, 500);
    },
    [current, animating],
  );

  useEffect(() => {
    const timer = setInterval(() => {
      goTo((current + 1) % SLIDES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [current, goTo]);

  return (
    <section className="relative h-screen overflow-hidden">
      {/* Mobile images slideshow (shown only on small screens) */}
      <div className="block sm:hidden">
        {MOBILE_SLIDES.map((src, i) => (
          <div
            key={src}
            className="absolute inset-0 transition-opacity duration-700 ease-in-out"
            style={{ opacity: i === current % MOBILE_SLIDES.length ? 1 : 0 }}
          >
            <Image
              src={src}
              alt={imgAlt}
              fill
              priority={i === 0}
              sizes="100vw"
              className="object-cover object-top"
            />
          </div>
        ))}
      </div>

      {/* Desktop images slideshow (hidden on mobile) */}
      <div className="hidden sm:block">
        {SLIDES.map((src, i) => (
          <div
            key={src}
            className="absolute inset-0 transition-opacity duration-700 ease-in-out"
            style={{ opacity: i === current ? 1 : 0 }}
          >
            <Image
              src={src}
              alt={imgAlt}
              fill
              priority={i === 0}
              sizes="100vw"
              className="object-cover object-top"
            />
          </div>
        ))}
      </div>

      {/* Text — top on mobile, center on desktop */}
      <div className="absolute inset-0 z-10 flex items-start sm:items-center pt-10 sm:pt-0">
        <div className="px-6 sm:px-24 lg:px-36 w-full max-w-5xl">
          <div className="animate-fade-in-up space-y-5 sm:space-y-8">
            <p className="text-xs font-bold uppercase tracking-[0.45em] text-accent">
              {badge}
            </p>
            <h1 className="font-serif text-4xl sm:text-6xl font-semibold leading-[1.05] tracking-tight text-foreground lg:text-7xl xl:text-8xl">
              {title}
            </h1>
            <p className="text-base sm:text-xl leading-relaxed text-foreground/60 max-w-xs sm:max-w-2xl">
              {description}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-1">
              <Button href="/contact#formular" size="lg" className="px-8 sm:px-10 py-4 text-sm sm:text-base">
                {ctaLabel}
              </Button>
              <Button href="/servicii" variant="outline" size="lg" className="px-8 sm:px-10 py-4 text-sm sm:text-base">
                {servicesLabel}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Slide indicators — bottom center */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            aria-label={`Slide ${i + 1}`}
            className="h-px transition-all duration-300 ease-in-out"
            style={{
              width: i === current ? "40px" : "16px",
              backgroundColor:
                i === current ? "var(--accent)" : "var(--foreground)",
              opacity: i === current ? 1 : 0.3,
            }}
          />
        ))}
      </div>
    </section>
  );
}
