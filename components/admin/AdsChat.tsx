"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { secureFetch } from "@/lib/csrf-client";

interface Entry {
  id: string;
  question: string;
  answer: string;
  basedOn: string | null;
  createdAt: string;
}

/** Questions worth asking that the stored report can actually answer. */
const SUGGESTIONS = [
  "Care reclamă ar trebui oprită prima și de ce?",
  "Ce s-a schimbat în ultimele două săptămâni?",
  "Merită să mut bugetul de la coroane la igienizare?",
  "Care zi a fost cea mai scumpă și de ce?",
];

/**
 * Floating assistant, docked bottom-right.
 *
 * Kept out of the page flow on purpose: the questions worth asking occur while
 * reading a table halfway down, and a box at the bottom of the page is a box
 * nobody scrolls back to.
 */
export default function AdsChat({ disabled }: { disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [pending, setPending] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadHistory = useCallback(async () => {
    try {
      const res = await secureFetch("/api/admin/ads/chat");
      const data = await res.json();
      if (res.ok) setEntries(data.entries ?? []);
    } catch {
      // A missing history is not worth an error banner over the chat itself.
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    inputRef.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const scrollDown = () =>
    requestAnimationFrame(() =>
      endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }),
    );

  const ask = async (text: string) => {
    const q = text.trim();
    if (!q || busy) return;

    setError(null);
    setBusy(true);
    setQuestion("");
    setPending(q);
    scrollDown();

    // Only the recent pairs travel back: the report is the expensive part of
    // the prompt, and older chatter adds cost without adding grounding.
    const history = entries.slice(-3).flatMap((e) => [
      { role: "user" as const, content: e.question },
      { role: "assistant" as const, content: e.answer },
    ]);

    try {
      const res = await secureFetch("/api/admin/ads/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, history }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Asistentul a eșuat.");
      setEntries((prev) => [...prev, data.entry as Entry]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(null);
      setBusy(false);
      scrollDown();
    }
  };

  const remove = async (id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
    try {
      await secureFetch(`/api/admin/ads/chat?id=${id}`, { method: "DELETE" });
    } catch {
      loadHistory();
    }
  };

  const clearAll = async () => {
    if (!confirm("Ștergi tot istoricul de întrebări?")) return;
    setEntries([]);
    try {
      await secureFetch("/api/admin/ads/chat?all=true", { method: "DELETE" });
    } catch {
      loadHistory();
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={disabled}
        className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2.5 bg-foreground text-white text-sm font-semibold pl-4 pr-5 py-3 shadow-lg hover:bg-foreground/90 transition-colors disabled:opacity-50"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M12 2l1.9 5.1L19 9l-5.1 1.9L12 16l-1.9-5.1L5 9l5.1-1.9L12 2zM19 15l.95 2.55L22.5 18.5l-2.55.95L19 22l-.95-2.55L15.5 18.5l2.55-.95L19 15z" />
        </svg>
        Întreabă despre reclame
        {entries.length > 0 && (
          <span className="bg-white/20 text-[11px] px-1.5 py-0.5 rounded-full tabular-nums">
            {entries.length}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-40 w-[calc(100vw-3rem)] sm:w-[27rem] max-h-[min(40rem,calc(100vh-4rem))] flex flex-col bg-background border border-border shadow-2xl">
      <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-border">
        <div>
          <h2 className="font-serif text-base font-medium text-foreground">
            Întreabă despre reclame
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Răspunde doar din raport. Dacă ceva nu e în date, spune că nu e.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {entries.length > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="text-xs text-muted-foreground hover:text-red-600 transition-colors"
            >
              Șterge tot
            </button>
          )}
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Închide"
            className="text-muted-foreground hover:text-foreground text-xl leading-none"
          >
            ×
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 min-h-[8rem]">
        {entries.length === 0 && !pending && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Încearcă:</p>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                disabled={disabled || busy}
                onClick={() => ask(s)}
                className="block w-full text-left text-xs border border-border px-3 py-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {entries.map((e) => (
          <div key={e.id} className="group">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold text-foreground border-l-2 border-foreground/30 pl-3 flex-1">
                {e.question}
              </p>
              <button
                type="button"
                onClick={() => remove(e.id)}
                aria-label="Șterge întrebarea"
                className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-muted-foreground hover:text-red-600 text-sm transition-opacity shrink-0"
              >
                ×
              </button>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line mt-2 pl-3">
              {e.answer}
            </p>
          </div>
        ))}

        {pending && (
          <div>
            <p className="text-sm font-semibold text-foreground border-l-2 border-foreground/30 pl-3">
              {pending}
            </p>
            <p className="text-sm text-muted-foreground mt-2 pl-3">Se gândește…</p>
          </div>
        )}

        {error && <p className="text-xs text-red-600">{error}</p>}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(question);
        }}
        className="px-4 py-3 border-t border-border flex gap-2"
      >
        <input
          ref={inputRef}
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          disabled={disabled || busy}
          maxLength={500}
          placeholder="Scrie o întrebare…"
          className="flex-1 border border-border px-3 py-2 text-sm focus:border-foreground focus:outline-none disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={disabled || busy || !question.trim()}
          className="bg-foreground text-white text-sm font-semibold px-4 py-2 hover:bg-foreground/90 transition-colors disabled:opacity-50"
        >
          {busy ? "…" : "Trimite"}
        </button>
      </form>
    </div>
  );
}
