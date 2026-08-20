"use client";

import { useRef, useState } from "react";
import { secureFetch } from "@/lib/csrf-client";

interface Turn {
  role: "user" | "assistant";
  content: string;
}

/** Questions worth asking that the stored report can actually answer. */
const SUGGESTIONS = [
  "Care reclamă ar trebui oprită prima și de ce?",
  "Cât m-a costat un contact în ultima lună față de media pe tot istoricul?",
  "Ce s-a schimbat în ultimele două săptămâni?",
  "Merită să mut bugetul de la coroane la igienizare?",
];

export default function AdsChat({ disabled }: { disabled?: boolean }) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const ask = async (text: string) => {
    const q = text.trim();
    if (!q || busy) return;

    setError(null);
    setBusy(true);
    setQuestion("");
    const history = turns.slice(-6);
    setTurns((prev) => [...prev, { role: "user", content: q }]);

    try {
      const res = await secureFetch("/api/admin/ads/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, history }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Asistentul a eșuat.");
      setTurns((prev) => [...prev, { role: "assistant", content: data.answer }]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      requestAnimationFrame(() =>
        endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }),
      );
    }
  };

  return (
    <section className="bg-background border border-border">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="font-serif text-lg font-medium text-foreground">
          Întreabă despre datele astea
        </h2>
        <p className="text-sm text-muted-foreground">
          Răspunde numai din raportul de mai sus. Dacă ceva nu e în date, spune
          că nu e — nu estimează.
        </p>
      </div>

      {turns.length > 0 && (
        <div className="px-5 py-4 space-y-4 max-h-[28rem] overflow-y-auto">
          {turns.map((t, i) =>
            t.role === "user" ? (
              <p
                key={i}
                className="text-sm font-semibold text-foreground border-l-2 border-foreground/30 pl-3"
              >
                {t.content}
              </p>
            ) : (
              <p
                key={i}
                className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line"
              >
                {t.content}
              </p>
            ),
          )}
          {busy && (
            <p className="text-sm text-muted-foreground">Se gândește…</p>
          )}
          <div ref={endRef} />
        </div>
      )}

      {turns.length === 0 && (
        <div className="px-5 pt-4 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              disabled={disabled || busy}
              onClick={() => ask(s)}
              className="text-xs border border-border px-3 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(question);
        }}
        className="px-5 py-4 flex flex-col sm:flex-row gap-2"
      >
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          disabled={disabled || busy}
          maxLength={500}
          placeholder="De ce a scăzut numărul de contacte săptămâna trecută?"
          className="flex-1 border border-border px-3 py-2 text-sm focus:border-foreground focus:outline-none disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={disabled || busy || !question.trim()}
          className="bg-foreground text-white text-sm font-semibold px-5 py-2 hover:bg-foreground/90 transition-colors disabled:opacity-50"
        >
          {busy ? "…" : "Întreabă"}
        </button>
      </form>

      {error && (
        <p className="px-5 pb-4 text-xs text-red-600">{error}</p>
      )}
    </section>
  );
}
