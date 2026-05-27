"use client";

import Image from "next/image";
import { useState, useEffect, useCallback, useRef } from "react";

interface Review {
  name: string;
  image?: string | null;
  text: string;
}

const FALLBACK_REVIEWS: Review[] = [
  {
    name: "Maria Constantin",
    text: "Am venit cu frică la prima consultație, dar medicul m-a liniștit imediat. Profesionalism, răbdare și rezultate excelente. Recomand cu toată inima!",
  },
  {
    name: "Alexandru Popescu",
    text: "Clinică impecabilă, echipamente moderne și personal extrem de amabil. Mi-am făcut implant dentar și sunt absolut mulțumit de rezultat. Merită fiecare leu!",
  },
  {
    name: "Elena Rusu",
    text: "Copilul meu a mers prima dată la dentist fără să plângă! Echipa este minunată cu cei mici, răbdătoare și prietenoasă. Locul nostru de încredere.",
  },
  {
    name: "Ion Munteanu",
    text: "Apreciez enorm că mi s-a explicat fiecare pas al tratamentului. Transparență totală, prețuri corecte și un zâmbet nou. Mulțumesc echipei TehnicalDent!",
  },
  {
    name: "Natalia Vrabie",
    text: "Am venit pentru albire dentară și rezultatul m-a uimit. Procedura a durat mai puțin decât mă așteptam și efectul este spectaculos. Revin cu siguranță!",
  },
  {
    name: "Dumitru Ciobanu",
    text: "Programare rapidă, fără așteptare. Cabinet curat, atmosferă relaxantă. Tratamentul de canal a decurs fără durere — lucru rar. Felicitări întregii echipe!",
  },
];

const AUTOPLAY_DURATION = 5000;
const CIRCUMFERENCE = 2 * Math.PI * 9; // r=9

export default function ReviewsSection({
  testimonials,
}: {
  testimonials?: { name: string; content: string; image?: string | null }[];
}) {
  const REVIEWS: Review[] =
    testimonials && testimonials.length > 0
      ? testimonials.map((t) => ({
          name: t.name,
          image: t.image,
          text: t.content,
        }))
      : FALLBACK_REVIEWS;
  const [current, setCurrent] = useState(0);
  // animKey changes every time we set a new slide → forces SVG to remount → CSS animation restarts
  const [animKey, setAnimKey] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const total = REVIEWS.length;

  const goTo = useCallback(
    (index: number) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      setCurrent((index + total) % total);
      setAnimKey((k) => k + 1);
    },
    [total],
  );

  const goNext = useCallback(() => goTo(current + 1), [current, goTo]);
  const goPrev = useCallback(() => goTo(current - 1), [current, goTo]);

  // Autoplay via simple timeout
  useEffect(() => {
    timerRef.current = setTimeout(() => {
      setCurrent((c) => (c + 1) % total);
      setAnimKey((k) => k + 1);
    }, AUTOPLAY_DURATION);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [current, total]);

  const prev = (current - 1 + total) % total;
  const next = (current + 1) % total;

  return (
    <section className="bg-muted py-16 lg:py-24 overflow-hidden">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* LEFT — title + logos */}
          <div className="flex flex-col justify-between h-full gap-12">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent mb-4">
                Recenzii
              </p>
              <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-medium text-foreground leading-tight">
                Sute de recenzii pozitive în online
              </h2>
            </div>

            {/* Pale logos */}
            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
              {["Google", "Facebook", "LinkedIn", "YouTube"].map((logo) => (
                <span
                  key={logo}
                  className="font-bold text-2xl lg:text-3xl select-none"
                  style={{ color: "rgba(0,0,0,0.08)" }}
                >
                  {logo}
                </span>
              ))}
            </div>

            {/* Navigation — hidden on mobile, shown on desktop inside left col */}
            <div className="hidden lg:flex items-center gap-4">
              <button
                onClick={goPrev}
                className="w-11 h-11 rounded-full border border-border flex items-center justify-center text-foreground hover:bg-muted transition-colors duration-200"
                aria-label="Recenzia anterioară"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 19.5L8.25 12l7.5-7.5"
                  />
                </svg>
              </button>

              {/* Dot indicators */}
              <div className="flex items-center gap-2">
                {REVIEWS.map((_, i) => {
                  const isActive = i === current;
                  return (
                    <button
                      key={i}
                      onClick={() => goTo(i)}
                      aria-label={`Recenzia ${i + 1}`}
                      className="relative flex items-center justify-center transition-all duration-300"
                      style={{
                        width: isActive ? 28 : 10,
                        height: isActive ? 28 : 10,
                      }}
                    >
                      {isActive ? (
                        <>
                          <span className="absolute inset-0 rounded-full bg-accent/20" />
                          {/* SVG ring with CSS animation — key forces remount on slide change */}
                          <svg
                            key={animKey}
                            className="absolute inset-0 w-full h-full -rotate-90"
                            viewBox="0 0 28 28"
                          >
                            {/* Track */}
                            <circle
                              cx="14"
                              cy="14"
                              r="9"
                              fill="none"
                              stroke="var(--accent)"
                              strokeWidth="2.5"
                              strokeOpacity="0.25"
                              strokeDasharray={CIRCUMFERENCE}
                            />
                            {/* Animated fill */}
                            <circle
                              cx="14"
                              cy="14"
                              r="9"
                              fill="none"
                              stroke="var(--accent)"
                              strokeWidth="2.5"
                              strokeDasharray={CIRCUMFERENCE}
                              strokeDashoffset={CIRCUMFERENCE}
                              strokeLinecap="round"
                              style={{
                                animation: `ring-fill ${AUTOPLAY_DURATION}ms linear forwards`,
                              }}
                            />
                          </svg>
                          <span className="relative w-2.5 h-2.5 rounded-full bg-accent" />
                          <style>{`
                            @keyframes ring-fill {
                              from { stroke-dashoffset: ${CIRCUMFERENCE}; }
                              to   { stroke-dashoffset: 0; }
                            }
                          `}</style>
                        </>
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-border hover:bg-accent/40 transition-colors duration-200" />
                      )}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={goNext}
                className="w-11 h-11 rounded-full border border-border flex items-center justify-center text-foreground hover:bg-muted transition-colors duration-200"
                aria-label="Recenzia următoare"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
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

          {/* RIGHT — reviews stack */}
          <div className="relative flex flex-col gap-0 select-none">
            {/* Top fade mask */}
            <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-muted to-transparent z-10 pointer-events-none" />
            {/* Bottom fade mask */}
            <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-muted to-transparent z-10 pointer-events-none" />

            <div className="flex flex-col gap-2 py-6">
              {/* Previous review */}
              <ReviewCard
                review={REVIEWS[prev]}
                opacity={0.3}
                blur={true}
                scale={0.95}
              />

              {/* Active review */}
              <ReviewCard
                review={REVIEWS[current]}
                opacity={1}
                blur={false}
                scale={1}
                active
              />

              {/* Next review */}
              <ReviewCard
                review={REVIEWS[next]}
                opacity={0.3}
                blur={true}
                scale={0.95}
              />
            </div>
          </div>
        </div>

        {/* Navigation — mobile only, below the reviews stack */}
        <div className="lg:hidden flex items-center justify-center gap-4 mt-6">
          <button
            onClick={goPrev}
            className="w-11 h-11 rounded-full border border-border flex items-center justify-center text-foreground hover:bg-background transition-colors duration-200"
            aria-label="Recenzia anterioară"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 19.5L8.25 12l7.5-7.5"
              />
            </svg>
          </button>

          <div className="flex items-center gap-2">
            {REVIEWS.map((_, i) => {
              const isActive = i === current;
              return (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  aria-label={`Recenzia ${i + 1}`}
                  className="relative flex items-center justify-center transition-all duration-300"
                  style={{
                    width: isActive ? 28 : 10,
                    height: isActive ? 28 : 10,
                  }}
                >
                  {isActive ? (
                    <>
                      <span className="absolute inset-0 rounded-full bg-accent/20" />
                      <svg
                        key={animKey}
                        className="absolute inset-0 w-full h-full -rotate-90"
                        viewBox="0 0 28 28"
                      >
                        <circle
                          cx="14"
                          cy="14"
                          r="9"
                          fill="none"
                          stroke="var(--accent)"
                          strokeWidth="2.5"
                          strokeOpacity="0.25"
                          strokeDasharray={CIRCUMFERENCE}
                        />
                        <circle
                          cx="14"
                          cy="14"
                          r="9"
                          fill="none"
                          stroke="var(--accent)"
                          strokeWidth="2.5"
                          strokeDasharray={CIRCUMFERENCE}
                          strokeDashoffset={CIRCUMFERENCE}
                          strokeLinecap="round"
                          style={{
                            animation: `ring-fill ${AUTOPLAY_DURATION}ms linear forwards`,
                          }}
                        />
                      </svg>
                      <span className="relative w-2.5 h-2.5 rounded-full bg-accent" />
                    </>
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-border hover:bg-accent/40 transition-colors duration-200" />
                  )}
                </button>
              );
            })}
          </div>

          <button
            onClick={goNext}
            className="w-11 h-11 rounded-full border border-border flex items-center justify-center text-foreground hover:bg-background transition-colors duration-200"
            aria-label="Recenzia următoare"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
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
    </section>
  );
}

function ReviewCard({
  review,
  opacity,
  blur,
  scale,
  active = false,
}: {
  review: Review;
  opacity: number;
  blur: boolean;
  scale: number;
  active?: boolean;
}) {
  const initials = review.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className="flex gap-4 items-start transition-all duration-500 px-2 py-4"
      style={{
        opacity,
        filter: blur ? "blur(1.5px)" : "none",
        transform: `scale(${scale})`,
        transformOrigin: "left center",
      }}
    >
      {/* Avatar + stars column */}
      <div className="flex flex-col items-center gap-2 flex-shrink-0 w-16">
        <div
          className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center text-sm font-semibold text-white flex-shrink-0"
          style={{
            backgroundColor: active
              ? "var(--accent)"
              : "var(--muted-foreground)",
          }}
        >
          {review.image ? (
            <Image
              src={review.image}
              alt={review.name}
              width={48}
              height={48}
              className="w-full h-full object-cover"
            />
          ) : (
            initials
          )}
        </div>
        {/* Stars */}
        <div className="flex gap-0.5">
          {[...Array(5)].map((_, i) => (
            <svg
              key={i}
              className="w-3 h-3"
              viewBox="0 0 20 20"
              fill={active ? "#f59e0b" : "#d1d5db"}
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          ))}
        </div>
        <p className="text-xs text-muted-foreground text-center leading-tight">
          {review.name}
        </p>
      </div>

      {/* Review text */}
      <p
        className="font-serif italic leading-relaxed"
        style={{
          fontSize: active ? "1.2rem" : "1rem",
          color: active ? "var(--foreground)" : "var(--muted-foreground)",
          transition: "all 0.5s ease",
        }}
      >
        „{review.text}"
      </p>
    </div>
  );
}
