"use client";

import { useEffect, useState } from "react";
import { secureFetch } from "@/lib/csrf-client";

export interface SocialPostDraft {
  title: string;
  facebookCaption: string;
  instagramCaption: string;
  tags: string[];
}

interface SocialAiPanelProps {
  onDraft: (draft: SocialPostDraft) => void;
  /** How many images the post carries, so the copy can be structured to match. */
  slideCount: number;
}

const LENGTHS = [
  { value: "scurt", label: "Scurt" },
  { value: "mediu", label: "Mediu" },
  { value: "lung", label: "Lung" },
] as const;

const TONES = [
  { value: "cald", label: "Cald" },
  { value: "informativ", label: "Informativ" },
  { value: "profesional", label: "Profesional" },
] as const;

export default function SocialAiPanel({
  onDraft,
  slideCount,
}: SocialAiPanelProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [topic, setTopic] = useState("");
  const [length, setLength] = useState<string>("mediu");
  const [tone, setTone] = useState<string>("cald");
  const [askQuestion, setAskQuestion] = useState(true);
  const [avoid, setAvoid] = useState("");
  const [preview, setPreview] = useState<SocialPostDraft | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

  const generate = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await secureFetch("/api/admin/blog/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate-post",
          topic,
          length,
          tone,
          askQuestion,
          avoid,
          carouselSlides: slideCount,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Asistentul AI a eșuat.");
      setPreview(data.draft as SocialPostDraft);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const pill = (active: boolean) =>
    `px-3 py-1.5 text-xs font-semibold border transition-colors ${
      active
        ? "bg-foreground text-background border-foreground"
        : "border-border hover:bg-muted"
    }`;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 text-sm font-semibold border border-border px-4 py-2 hover:bg-muted transition-colors"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M12 2l1.9 5.1L19 9l-5.1 1.9L12 16l-1.9-5.1L5 9l5.1-1.9L12 2zM19 15l.95 2.55L22.5 18.5l-2.55.95L19 22l-.95-2.55L15.5 18.5l2.55-.95L19 15z" />
        </svg>
        Scrie cu AI
      </button>

      {!open ? null : (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:p-8"
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Scrie postarea cu AI"
            className="w-full max-w-xl bg-background border border-border my-auto"
          >
            <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-border">
              <div>
                <h2 className="font-serif text-lg font-medium text-foreground">
                  Scrie postarea
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {slideCount > 1
                    ? `Textul va fi structurat pe ${slideCount} idei, câte una per imagine.`
                    : "Postarea nu trimite nicăieri, deci textul trebuie să spună tot."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Închide"
                className="text-muted-foreground hover:text-foreground text-xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="px-5 py-5 space-y-5">
              {preview ? (
                <div className="space-y-3 text-sm">
                  <p className="text-xs text-muted-foreground">
                    Etichetă internă: {preview.title}
                  </p>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Facebook</p>
                    <p className="whitespace-pre-line text-foreground/80 border border-border p-3">
                      {preview.facebookCaption}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Instagram</p>
                    <p className="whitespace-pre-line text-foreground/80 border border-border p-3">
                      {preview.instagramCaption}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Etichete: {preview.tags.join(", ")}
                  </p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Despre ce este postarea?
                    </label>
                    <input
                      type="text"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder="3 obiceiuri care îți pătează dinții"
                      className="w-full border border-border px-3 py-2 text-sm focus:border-foreground focus:outline-none"
                    />
                  </div>

                  <div>
                    <p className="text-sm font-medium text-foreground mb-2">
                      Lungime text
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {LENGTHS.map((l) => (
                        <button
                          key={l.value}
                          type="button"
                          onClick={() => setLength(l.value)}
                          className={pill(length === l.value)}
                        >
                          {l.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-foreground mb-2">Ton</p>
                    <div className="flex flex-wrap gap-2">
                      {TONES.map((t) => (
                        <button
                          key={t.value}
                          type="button"
                          onClick={() => setTone(t.value)}
                          className={pill(tone === t.value)}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <label className="flex items-start gap-3 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={askQuestion}
                      onChange={(e) => setAskQuestion(e.target.checked)}
                      className="w-4 h-4 mt-0.5"
                    />
                    <span>
                      Termină cu o întrebare
                      <span className="block text-xs text-muted-foreground">
                        invită la comentarii
                      </span>
                    </span>
                  </label>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      De evitat{" "}
                      <span className="text-muted-foreground">(opțional)</span>
                    </label>
                    <input
                      type="text"
                      value={avoid}
                      onChange={(e) => setAvoid(e.target.value)}
                      placeholder="fără emoji, fără superlative"
                      className="w-full border border-border px-3 py-2 text-sm focus:border-foreground focus:outline-none"
                    />
                  </div>
                </>
              )}

              {error && <p className="text-xs text-red-600">{error}</p>}
            </div>

            <div className="flex justify-between gap-3 px-5 py-4 border-t border-border bg-muted/30">
              {preview ? (
                <>
                  <button
                    type="button"
                    onClick={() => setPreview(null)}
                    className="text-sm font-semibold border border-border px-4 py-2 hover:bg-muted transition-colors"
                  >
                    Înapoi
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onDraft(preview);
                      setOpen(false);
                      setPreview(null);
                    }}
                    className="text-sm font-semibold bg-foreground text-background px-5 py-2 hover:opacity-90 transition-opacity"
                  >
                    Completează formularul
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="text-sm font-semibold border border-border px-4 py-2 hover:bg-muted transition-colors"
                  >
                    Anulează
                  </button>
                  <button
                    type="button"
                    disabled={busy || !topic.trim()}
                    onClick={generate}
                    className="text-sm font-semibold bg-foreground text-background px-5 py-2 hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {busy ? "Scriu…" : "Generează"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
