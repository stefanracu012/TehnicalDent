"use client";

import { useEffect, useState } from "react";
import { secureFetch } from "@/lib/csrf-client";

export interface DraftSection {
  title: string;
  text: string;
}

export interface ArticleDraft {
  title: string;
  excerpt: string;
  category: string;
  tags: string[];
  metaTitle: string;
  metaDescription: string;
  facebookCaption: string;
  instagramCaption: string;
  sections: DraftSection[];
}

interface TopicIdea {
  title: string;
  angle: string;
  category: string;
  targetQuery: string;
}

interface BlogAiPanelProps {
  /** Fills the form with the draft the editor accepted. */
  onDraft: (draft: ArticleDraft) => void;
  /** Current form contents, so a revision edits what the editor sees. */
  current: ArticleDraft | null;
}

const LENGTHS = [
  { value: "scurt", label: "Scurt", hint: "3-4 secțiuni" },
  { value: "mediu", label: "Mediu", hint: "4-6 secțiuni" },
  { value: "lung", label: "Lung", hint: "7-9 secțiuni" },
] as const;

const TONES = [
  { value: "informativ", label: "Informativ", hint: "explicativ, neutru" },
  { value: "cald", label: "Cald", hint: "pentru pacienți anxioși" },
  { value: "profesional", label: "Profesional", hint: "concis, la obiect" },
] as const;

const INCLUDES = [
  { key: "includeFaq", label: "Întrebări frecvente", hint: "4-6 întrebări scurte cu răspunsuri" },
  { key: "includeMyths", label: "Combate mituri", hint: "corectează credințele greșite" },
  { key: "includeWarnings", label: "Semnale de alarmă", hint: "când trebuie venit urgent" },
  { key: "includePrices", label: "Vorbește despre costuri", hint: "doar general, fără sume" },
] as const;

type IncludeKey = (typeof INCLUDES)[number]["key"];

export default function BlogAiPanel({ onDraft, current }: BlogAiPanelProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<null | "suggest" | "generate" | "revise">(null);
  const [error, setError] = useState<string | null>(null);

  const [topics, setTopics] = useState<TopicIdea[] | null>(null);
  const [topic, setTopic] = useState("");
  const [length, setLength] = useState<string>("mediu");
  const [tone, setTone] = useState<string>("informativ");
  const [includes, setIncludes] = useState<Record<IncludeKey, boolean>>({
    includeFaq: true,
    includeMyths: false,
    includeWarnings: false,
    includePrices: false,
  });
  const [avoid, setAvoid] = useState("");
  const [category, setCategory] = useState<string | undefined>(undefined);

  const [preview, setPreview] = useState<ArticleDraft | null>(null);
  const [instruction, setInstruction] = useState("");

  // Escape closes, and the page behind must not scroll while the dialog is up.
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

  async function call(payload: Record<string, unknown>) {
    const res = await secureFetch("/api/admin/blog/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Asistentul AI a eșuat.");
    return data;
  }

  const run = async (
    kind: "suggest" | "generate" | "revise",
    payload: Record<string, unknown>,
    after: (data: Record<string, unknown>) => void,
  ) => {
    setBusy(kind);
    setError(null);
    try {
      after(await call(payload));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const generate = () =>
    run(
      "generate",
      { action: "generate", topic, category, length, tone, avoid, ...includes },
      (d) => setPreview(d.draft as ArticleDraft),
    );

  const accept = () => {
    if (preview) onDraft(preview);
    setOpen(false);
    setPreview(null);
    setInstruction("");
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
            aria-label="Asistent de redactare"
            className="w-full max-w-2xl bg-background border border-border my-auto"
          >
            {/* ── Header ─────────────────────────────────────────────── */}
            <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-border">
              <div>
                <h2 className="font-serif text-lg font-medium text-foreground">
                  Asistent de redactare
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Scrie ciorna în română. Citește-o înainte de publicare — este
                  conținut medical.
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

            <div className="px-5 py-5 space-y-6">
              {preview ? (
                /* ── Preview ──────────────────────────────────────── */
                <>
                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Titlu</p>
                      <p className="font-medium text-foreground">{preview.title}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        În Google ({preview.metaDescription.length} caractere)
                      </p>
                      <p className="text-accent">{preview.metaTitle}</p>
                      <p className="text-muted-foreground text-xs mt-0.5">
                        {preview.metaDescription}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {preview.sections.length} secțiuni
                      </p>
                      <ul className="list-disc list-inside text-foreground/80">
                        {preview.sections.map((s, i) => (
                          <li key={i}>{s.title}</li>
                        ))}
                      </ul>
                    </div>
                    <details className="border border-border">
                      <summary className="cursor-pointer px-3 py-2 text-xs font-semibold select-none">
                        Texte pentru Facebook și Instagram
                      </summary>
                      <div className="px-3 pb-3 pt-1 space-y-3 text-xs whitespace-pre-line text-foreground/80">
                        <p>{preview.facebookCaption}</p>
                        <p className="border-t border-border pt-3">
                          {preview.instagramCaption}
                        </p>
                      </div>
                    </details>
                    <p className="text-xs text-muted-foreground">
                      Etichete: {preview.tags.join(", ")}
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 border-t border-border pt-4">
                    <input
                      type="text"
                      value={instruction}
                      onChange={(e) => setInstruction(e.target.value)}
                      placeholder="Ce să schimb? „mai scurt”, „scoate secțiunea 3”"
                      className="flex-1 border border-border px-3 py-2 text-sm focus:border-foreground focus:outline-none"
                    />
                    <button
                      type="button"
                      disabled={busy !== null || !instruction.trim()}
                      onClick={() =>
                        run(
                          "revise",
                          { action: "revise", current: preview, instruction },
                          (d) => {
                            setPreview(d.draft as ArticleDraft);
                            setInstruction("");
                          },
                        )
                      }
                      className="text-sm font-semibold border border-border px-4 py-2 hover:bg-muted transition-colors disabled:opacity-50"
                    >
                      {busy === "revise" ? "Modific…" : "Modifică"}
                    </button>
                  </div>
                </>
              ) : (
                /* ── Setup ────────────────────────────────────────── */
                <>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Despre ce scriem?
                    </label>
                    <input
                      type="text"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder="„doare scoaterea nervului?”"
                      className="w-full border border-border px-3 py-2 text-sm focus:border-foreground focus:outline-none"
                    />
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() =>
                        run("suggest", { action: "suggest", count: 6 }, (d) =>
                          setTopics(d.topics as TopicIdea[]),
                        )
                      }
                      className="mt-2 text-xs font-semibold text-accent hover:underline disabled:opacity-50"
                    >
                      {busy === "suggest"
                        ? "Caut subiecte…"
                        : "Nu știu — sugerează-mi subiecte"}
                    </button>

                    {topics && (
                      <ul className="mt-3 space-y-2 max-h-56 overflow-y-auto">
                        {topics.map((t, i) => (
                          <li key={i}>
                            <button
                              type="button"
                              onClick={() => {
                                setTopic(`${t.title} — ${t.angle}`);
                                setCategory(t.category);
                              }}
                              className="w-full text-left border border-border bg-muted/30 p-3 text-sm hover:bg-muted transition-colors"
                            >
                              <span className="font-medium text-foreground block">
                                {t.title}
                              </span>
                              <span className="text-xs text-muted-foreground block mt-0.5">
                                {t.angle}
                              </span>
                              <span className="text-xs text-muted-foreground block mt-0.5">
                                caută: {t.targetQuery}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div>
                    <p className="text-sm font-medium text-foreground mb-2">Lungime</p>
                    <div className="flex flex-wrap gap-2">
                      {LENGTHS.map((l) => (
                        <button
                          key={l.value}
                          type="button"
                          onClick={() => setLength(l.value)}
                          className={pill(length === l.value)}
                          title={l.hint}
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
                          title={t.hint}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-foreground mb-2">
                      Ce să includă
                    </p>
                    <div className="space-y-2">
                      {INCLUDES.map((inc) => (
                        <label
                          key={inc.key}
                          className="flex items-start gap-3 text-sm cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={includes[inc.key]}
                            onChange={(e) =>
                              setIncludes((p) => ({
                                ...p,
                                [inc.key]: e.target.checked,
                              }))
                            }
                            className="w-4 h-4 mt-0.5"
                          />
                          <span>
                            {inc.label}
                            <span className="block text-xs text-muted-foreground">
                              {inc.hint}
                            </span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      De evitat <span className="text-muted-foreground">(opțional)</span>
                    </label>
                    <input
                      type="text"
                      value={avoid}
                      onChange={(e) => setAvoid(e.target.value)}
                      placeholder="„nu compara cu alte clinici”, „fără emoji”"
                      className="w-full border border-border px-3 py-2 text-sm focus:border-foreground focus:outline-none"
                    />
                  </div>
                </>
              )}

              {error && <p className="text-xs text-red-600">{error}</p>}
            </div>

            {/* ── Footer ─────────────────────────────────────────────── */}
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
                    onClick={accept}
                    className="text-sm font-semibold bg-foreground text-background px-5 py-2 hover:opacity-90 transition-opacity"
                  >
                    {current?.title
                      ? "Înlocuiește articolul"
                      : "Completează formularul"}
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
                    disabled={busy !== null || !topic.trim()}
                    onClick={generate}
                    className="text-sm font-semibold bg-foreground text-background px-5 py-2 hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {busy === "generate" ? "Scriu articolul…" : "Generează"}
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
