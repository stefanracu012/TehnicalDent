"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { secureFetch } from "@/lib/csrf-client";

interface Lead {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  source: string;
  firstMessage: string | null;
  status: string;
  note: string | null;
  followUpAt: string | null;
  patientId: string | null;
  createdAt: string;
}

const STATUSES = [
  { key: "nou", label: "Nou", className: "bg-blue-100 text-blue-700" },
  { key: "contactat", label: "Contactat", className: "bg-yellow-100 text-yellow-700" },
  { key: "programat", label: "Programat", className: "bg-purple-100 text-purple-700" },
  { key: "convertit", label: "Pacient", className: "bg-green-100 text-green-700" },
  { key: "pierdut", label: "Pierdut", className: "bg-muted text-muted-foreground" },
] as const;

const SOURCES: Record<string, string> = {
  messenger: "Messenger",
  instagram: "Instagram",
  whatsapp: "WhatsApp",
  formular: "Formular site",
  manual: "Adăugat manual",
};

const statusOf = (key: string) =>
  STATUSES.find((s) => s.key === key) ?? STATUSES[0];

const dayInput = (iso: string | null) => (iso ? iso.slice(0, 10) : "");

export default function AdminLeadsPage() {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [dueCount, setDueCount] = useState(0);
  const [filter, setFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ name: "", phone: "", note: "" });

  const load = useCallback(async () => {
    try {
      const res = await secureFetch(
        `/api/admin/leads${filter ? `?status=${filter}` : ""}`,
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Eroare la încărcare");
      setLeads(data.leads ?? []);
      setCounts(data.counts ?? {});
      setDueCount(data.dueCount ?? 0);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  const patch = async (id: string, data: Record<string, unknown>) => {
    setBusy(id);
    setError(null);
    try {
      const res = await secureFetch(`/api/admin/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Nu am putut salva.");
      }
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const convert = async (lead: Lead) => {
    if (!lead.phone) {
      setError("Adaugă întâi numărul de telefon — un pacient fără telefon nu poate fi creat.");
      return;
    }
    if (!confirm(`Creezi pacientul ${lead.name || lead.phone}?`)) return;

    setBusy(lead.id);
    setError(null);
    try {
      const res = await secureFetch(`/api/admin/leads/${lead.id}/convert`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Nu am putut crea pacientul.");
      if (data.reused) {
        alert("Exista deja un pacient cu acest număr — leadul a fost legat de el.");
      }
      router.push("/admin/pacienti");
    } catch (e) {
      setError((e as Error).message);
      setBusy(null);
    }
  };

  const remove = async (lead: Lead) => {
    if (!confirm("Ștergi leadul? Pacientul creat din el, dacă există, rămâne.")) return;
    setBusy(lead.id);
    try {
      const res = await secureFetch(`/api/admin/leads/${lead.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Nu am putut șterge.");
      }
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const addManual = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await secureFetch("/api/admin/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Nu am putut adăuga.");
      }
      setDraft({ name: "", phone: "", note: "" });
      setAdding(false);
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="min-h-screen bg-muted">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8 sm:py-14">
        <header className="flex flex-col sm:flex-row sm:items-start justify-between gap-5 mb-10">
          <div>
            <h1 className="font-serif text-3xl sm:text-4xl font-medium text-foreground">
              Leaduri
            </h1>
            <p className="mt-3 text-sm text-muted-foreground max-w-xl leading-relaxed">
              Oameni care au scris și încă nu sunt pacienți. Se adaugă singuri din
              Messenger, Instagram, WhatsApp și formularul de pe site — cu numărul
              de telefon completat automat, dacă îl lasă în mesaj.
            </p>
            {dueCount > 0 && (
              <p className="mt-3 text-sm font-semibold text-red-600">
                {dueCount} {dueCount === 1 ? "lead așteaptă" : "leaduri așteaptă"} un
                follow-up astăzi sau mai devreme.
              </p>
            )}
          </div>
          <button
            onClick={() => setAdding((v) => !v)}
            className="self-start bg-foreground text-white text-sm font-semibold px-5 py-2.5 hover:bg-foreground/90 transition-colors shrink-0"
          >
            {adding ? "Anulează" : "+ Adaugă manual"}
          </button>
        </header>

        {adding && (
          <form
            onSubmit={addManual}
            className="bg-background border border-border p-5 mb-8 grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3"
          >
            <input
              type="text"
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              placeholder="Nume"
              className="border border-border px-3 py-2 text-sm focus:border-foreground focus:outline-none"
            />
            <input
              type="tel"
              value={draft.phone}
              onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))}
              placeholder="Telefon — 069123456"
              className="border border-border px-3 py-2 text-sm focus:border-foreground focus:outline-none"
            />
            <button
              type="submit"
              className="bg-foreground text-white text-sm font-semibold px-5 py-2 hover:bg-foreground/90 transition-colors"
            >
              Adaugă
            </button>
            <input
              type="text"
              value={draft.note}
              onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))}
              placeholder="Notiță — de unde vine, ce a întrebat"
              className="sm:col-span-3 border border-border px-3 py-2 text-sm focus:border-foreground focus:outline-none"
            />
          </form>
        )}

        {error && (
          <div className="border border-red-200 bg-red-50 text-red-700 px-5 py-4 text-sm mb-8">
            {error}
          </div>
        )}

        <div className="flex flex-wrap gap-2 mb-8">
          <button
            onClick={() => setFilter("")}
            className={`px-4 py-2 text-sm font-semibold rounded-full transition-colors ${
              filter === ""
                ? "bg-foreground text-white"
                : "bg-background border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            Toate <span className="ml-1 text-xs opacity-60">({total})</span>
          </button>
          {STATUSES.map((s) => (
            <button
              key={s.key}
              onClick={() => setFilter(s.key)}
              className={`px-4 py-2 text-sm font-semibold rounded-full transition-colors ${
                filter === s.key
                  ? "bg-foreground text-white"
                  : "bg-background border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {s.label}
              <span className="ml-1 text-xs opacity-60">({counts[s.key] ?? 0})</span>
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Se încarcă…</p>
        ) : leads.length === 0 ? (
          <div className="bg-background border border-border p-12 text-center">
            <p className="text-muted-foreground">
              Niciun lead aici. Apar singuri când cineva scrie pe Messenger,
              Instagram, WhatsApp sau prin formularul de pe site.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {leads.map((lead) => {
              const status = statusOf(lead.status);
              const due =
                lead.followUpAt &&
                lead.followUpAt.slice(0, 10) <= today &&
                !["convertit", "pierdut"].includes(lead.status);

              return (
                <div
                  key={lead.id}
                  className={`bg-background border p-5 ${
                    due ? "border-red-300" : "border-border"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <h3 className="font-serif text-lg font-medium text-foreground">
                          {lead.name || "Fără nume"}
                        </h3>
                        <span
                          className={`px-2 py-0.5 text-xs font-semibold rounded-full ${status.className}`}
                        >
                          {status.label}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {SOURCES[lead.source] ?? lead.source}
                        </span>
                        {due && (
                          <span className="text-xs font-semibold text-red-600">
                            follow-up depășit
                          </span>
                        )}
                      </div>

                      {lead.phone ? (
                        <a
                          href={`tel:${lead.phone}`}
                          className="text-sm text-accent hover:underline tabular-nums"
                        >
                          {lead.phone}
                        </a>
                      ) : (
                        <input
                          type="tel"
                          placeholder="Adaugă telefon…"
                          onBlur={(e) =>
                            e.target.value.trim() &&
                            patch(lead.id, { phone: e.target.value.trim() })
                          }
                          className="text-sm border border-border px-2 py-1 mt-1 focus:border-foreground focus:outline-none"
                        />
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <select
                        value={lead.status}
                        disabled={busy === lead.id}
                        onChange={(e) => patch(lead.id, { status: e.target.value })}
                        className="text-xs border border-border px-2 py-1.5 bg-background focus:border-foreground focus:outline-none"
                      >
                        {STATUSES.map((s) => (
                          <option key={s.key} value={s.key}>
                            {s.label}
                          </option>
                        ))}
                      </select>

                      {!lead.patientId && (
                        <button
                          onClick={() => convert(lead)}
                          disabled={busy === lead.id}
                          className="text-xs font-semibold px-3 py-1.5 border border-green-300 text-green-700 hover:bg-green-50 transition-colors disabled:opacity-50"
                        >
                          Creează pacient
                        </button>
                      )}

                      <button
                        onClick={() => remove(lead)}
                        disabled={busy === lead.id}
                        className="text-xs font-semibold px-3 py-1.5 border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                      >
                        Șterge
                      </button>
                    </div>
                  </div>

                  {lead.firstMessage && (
                    <p className="text-sm text-muted-foreground leading-relaxed border-l-2 border-border pl-3 mb-3">
                      {lead.firstMessage}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
                    <label className="flex items-center gap-2">
                      <span>Follow-up:</span>
                      <input
                        type="date"
                        value={dayInput(lead.followUpAt)}
                        onChange={(e) =>
                          patch(lead.id, { followUpAt: e.target.value || null })
                        }
                        className="border border-border px-2 py-1 bg-background focus:border-foreground focus:outline-none"
                      />
                    </label>
                    <span>
                      Primit:{" "}
                      {new Date(lead.createdAt).toLocaleDateString("ro-RO", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                  </div>

                  <input
                    type="text"
                    defaultValue={lead.note ?? ""}
                    placeholder="Notiță — ce ați vorbit, ce urmează"
                    onBlur={(e) =>
                      e.target.value !== (lead.note ?? "") &&
                      patch(lead.id, { note: e.target.value })
                    }
                    className="w-full text-sm border border-border px-3 py-2 mt-3 focus:border-foreground focus:outline-none"
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
