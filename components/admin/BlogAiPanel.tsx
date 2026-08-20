"use client";

import { useState } from "react";
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
  /** Fills the form with a generated or revised draft. */
  onDraft: (draft: ArticleDraft) => void;
  /** Current form contents, so a revision edits what the editor sees. */
  current: ArticleDraft | null;
}

export default function BlogAiPanel({ onDraft, current }: BlogAiPanelProps) {
  const [busy, setBusy] = useState<null | "suggest" | "generate" | "revise">(null);
  const [topics, setTopics] = useState<TopicIdea[] | null>(null);
  const [topic, setTopic] = useState("");
  const [instruction, setInstruction] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function call(payload: Record<string, unknown>) {
    setError(null);
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
    try {
      after(await call(payload));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const hasDraft = Boolean(current?.title || current?.sections?.length);

  return (
    <div className="border border-border bg-muted/30 p-4 sm:p-5 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            Asistent de redactare
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Scrie ciorna în română. Verific-o înainte de publicare — este
            conținut medical.
          </p>
        </div>
      </div>

      {/* ── Ideas ─────────────────────────────────────────────────────── */}
      <div>
        <button
          type="button"
          disabled={busy !== null}
          onClick={() =>
            run("suggest", { action: "suggest", count: 6 }, (d) =>
              setTopics(d.topics as TopicIdea[]),
            )
          }
          className="text-sm font-semibold border border-border px-4 py-2 hover:bg-muted transition-colors disabled:opacity-50"
        >
          {busy === "suggest" ? "Caut subiecte…" : "Sugerează subiecte"}
        </button>

        {topics && (
          <ul className="mt-3 space-y-2">
            {topics.map((t, i) => (
              <li
                key={i}
                className="border border-border bg-background p-3 text-sm"
              >
                <p className="font-medium text-foreground">{t.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{t.angle}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Caută:{" "}
                  <span className="font-mono">{t.targetQuery}</span>
                </p>
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() =>
                    run(
                      "generate",
                      {
                        action: "generate",
                        topic: `${t.title} — ${t.angle}`,
                        category: t.category,
                      },
                      (d) => onDraft(d.draft as ArticleDraft),
                    )
                  }
                  className="mt-2 text-xs font-semibold text-accent hover:underline disabled:opacity-50"
                >
                  {busy === "generate" ? "Scriu…" : "Scrie acest articol →"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── Own topic ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Sau scrie tu subiectul: „doare scoaterea nervului?”"
          className="flex-1 border border-border px-3 py-2 text-sm focus:border-foreground focus:outline-none"
        />
        <button
          type="button"
          disabled={busy !== null || !topic.trim()}
          onClick={() =>
            run("generate", { action: "generate", topic }, (d) =>
              onDraft(d.draft as ArticleDraft),
            )
          }
          className="text-sm font-semibold bg-foreground text-background px-4 py-2 hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {busy === "generate" ? "Scriu…" : "Generează"}
        </button>
      </div>

      {/* ── Revision — only once there is something to revise ──────────── */}
      {hasDraft && (
        <div className="flex flex-col sm:flex-row gap-2 pt-1 border-t border-border">
          <input
            type="text"
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder="Ce să modific? „mai scurt”, „adaugă o secțiune despre preț”"
            className="flex-1 border border-border px-3 py-2 text-sm mt-3 focus:border-foreground focus:outline-none"
          />
          <button
            type="button"
            disabled={busy !== null || !instruction.trim()}
            onClick={() =>
              run(
                "revise",
                { action: "revise", current, instruction },
                (d) => {
                  onDraft(d.draft as ArticleDraft);
                  setInstruction("");
                },
              )
            }
            className="text-sm font-semibold border border-border px-4 py-2 mt-3 hover:bg-muted transition-colors disabled:opacity-50"
          >
            {busy === "revise" ? "Modific…" : "Modifică"}
          </button>
        </div>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
