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

const time = (iso: string) =>
  new Date(iso).toLocaleTimeString("ro-RO", {
    hour: "2-digit",
    minute: "2-digit",
  });

/**
 * Floating assistant, docked bottom-right, laid out as a conversation.
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
    requestAnimationFrame(() => endRef.current?.scrollIntoView({ block: "end" }));
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

  /**
   * Deletes on the server first, then updates the list.
   *
   * The optimistic order was worse than useless here: fetch resolves on a 403
   * as happily as on a 200, so a refused delete emptied the panel, said
   * nothing, and the entries reappeared on the next reload.
   */
  const deleteOnServer = async (query: string): Promise<boolean> => {
    setError(null);
    try {
      const res = await secureFetch(`/api/admin/ads/chat?${query}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(
          data.error ||
            (res.status === 403
              ? "Contul tău nu are dreptul de a șterge din istoric."
              : `Ștergerea a eșuat (${res.status}).`),
        );
        return false;
      }
      return true;
    } catch {
      setError("Ștergerea a eșuat. Verifică conexiunea.");
      return false;
    }
  };

  const remove = async (id: string) => {
    if (await deleteOnServer(`id=${id}`)) {
      setEntries((prev) => prev.filter((e) => e.id !== id));
    }
  };

  const clearAll = async () => {
    if (!confirm("Ștergi tot istoricul de întrebări?")) return;
    if (await deleteOnServer("all=true")) {
      setEntries([]);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={disabled}
        className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2.5 bg-foreground text-white text-sm font-semibold pl-4 pr-5 py-3.5 shadow-lg hover:bg-foreground/90 transition-colors disabled:opacity-50"
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
    <div className="fixed inset-x-4 bottom-4 sm:inset-x-auto sm:right-6 sm:bottom-6 z-40 sm:w-[34rem] h-[min(46rem,calc(100vh-2rem))] flex flex-col bg-background border border-border shadow-2xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-border shrink-0">
        <div>
          <h2 className="font-serif text-lg font-medium text-foreground">
            Asistent reclame
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Răspunde doar din raport. Dacă ceva nu e în date, spune că nu e.
          </p>
        </div>
        <div className="flex items-center gap-4 shrink-0">
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
            className="text-muted-foreground hover:text-foreground text-2xl leading-none"
          >
            ×
          </button>
        </div>
      </div>

      {/* Conversation */}
      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-5 bg-muted/30">
        {entries.length === 0 && !pending && (
          <div className="space-y-2.5">
            <p className="text-xs text-muted-foreground">Încearcă:</p>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                disabled={disabled || busy}
                onClick={() => ask(s)}
                className="block w-full text-left text-sm bg-background border border-border rounded-2xl px-4 py-3 text-muted-foreground hover:border-foreground/30 hover:text-foreground transition-colors disabled:opacity-50"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {entries.map((e) => (
          <div key={e.id} className="space-y-3 group">
            {/* Mine — right */}
            <div className="flex justify-end">
              <div className="flex items-end gap-2 max-w-[85%]">
                <button
                  type="button"
                  onClick={() => remove(e.id)}
                  aria-label="Șterge conversația"
                  className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-muted-foreground hover:text-red-600 text-sm transition-opacity shrink-0 pb-2"
                >
                  ×
                </button>
                <div className="bg-foreground text-white rounded-2xl rounded-br-md px-4 py-2.5">
                  <p className="text-sm leading-relaxed">{e.question}</p>
                  <p className="text-[10px] text-white/50 mt-1 text-right">
                    {time(e.createdAt)}
                  </p>
                </div>
              </div>
            </div>

            {/* Its — left */}
            <div className="flex justify-start">
              <div className="max-w-[85%] bg-background border border-border rounded-2xl rounded-bl-md px-4 py-3">
                <p className="text-sm text-foreground/85 leading-relaxed whitespace-pre-line">
                  {e.answer}
                </p>
              </div>
            </div>
          </div>
        ))}

        {pending && (
          <div className="space-y-3">
            <div className="flex justify-end">
              <div className="max-w-[85%] bg-foreground text-white rounded-2xl rounded-br-md px-4 py-2.5">
                <p className="text-sm leading-relaxed">{pending}</p>
              </div>
            </div>
            <div className="flex justify-start">
              <div className="bg-background border border-border rounded-2xl rounded-bl-md px-4 py-3">
                <span className="flex gap-1.5" aria-label="Se gândește">
                  {[0, 150, 300].map((delay) => (
                    <span
                      key={delay}
                      className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-pulse"
                      style={{ animationDelay: `${delay}ms` }}
                    />
                  ))}
                </span>
              </div>
            </div>
          </div>
        )}

        {error && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            {error}
          </p>
        )}
        <div ref={endRef} />
      </div>

      {/* Composer */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(question);
        }}
        className="px-5 py-4 border-t border-border flex gap-2.5 shrink-0"
      >
        <input
          ref={inputRef}
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          disabled={disabled || busy}
          maxLength={500}
          placeholder="Scrie o întrebare…"
          className="flex-1 border border-border rounded-full px-4 py-2.5 text-sm focus:border-foreground focus:outline-none disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={disabled || busy || !question.trim()}
          aria-label="Trimite"
          className="bg-foreground text-white rounded-full w-11 h-11 flex items-center justify-center hover:bg-foreground/90 transition-colors disabled:opacity-50 shrink-0"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M3.4 20.4l17.45-7.48a1 1 0 000-1.84L3.4 3.6a.99.99 0 00-1.39.91L2 9.12c0 .5.37.93.87.99L17 12 2.87 13.88c-.5.07-.87.5-.87 1l.01 4.61c0 .71.73 1.2 1.39.91z" />
          </svg>
        </button>
      </form>
    </div>
  );
}
