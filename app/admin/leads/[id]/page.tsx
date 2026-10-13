"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { secureFetch } from "@/lib/csrf-client";
import {
  CLOSED_STATUSES,
  LEAD_STATUSES,
  getSource,
  getStatus,
  whatsAppLink,
} from "@/lib/leads-config";
import LeadForm from "@/components/admin/LeadForm";
import {
  conversationHref,
  type LeadItem,
  type LeadNoteItem,
  type StaffMember,
} from "@/components/admin/lead-types";

interface LeadDetail extends LeadItem {
  leadNotes: LeadNoteItem[];
  patient: { id: string; name: string } | null;
  staff: StaffMember[];
}

const dayInput = (iso: string | null) => (iso ? iso.slice(0, 10) : "");
const inDays = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

const selectClass =
  "border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:border-foreground focus:outline-none";

export default function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await secureFetch(`/api/admin/leads/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Nu am putut încărca leadul.");
      setLead(data);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const patch = async (data: Record<string, unknown>) => {
    setBusy(true);
    try {
      const res = await secureFetch(`/api/admin/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Nu am putut salva.");
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const addNote = async () => {
    const content = noteText.trim();
    if (!content) return;
    setBusy(true);
    try {
      const res = await secureFetch("/api/admin/lead-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: id, content }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Nu am putut salva notița.");
      setNoteText("");
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const deleteNote = async (noteId: string) => {
    if (!confirm("Ștergi această notiță?")) return;
    try {
      const res = await secureFetch(`/api/admin/lead-notes/${noteId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Nu am putut șterge notița.");
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const convert = async () => {
    if (!lead?.phone) {
      setError("Adaugă întâi numărul de telefon — un pacient fără telefon nu poate fi creat.");
      return;
    }
    if (!confirm(`Creezi pacientul ${lead.name || lead.phone}?`)) return;
    setBusy(true);
    try {
      const res = await secureFetch(`/api/admin/leads/${id}/convert`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Nu am putut crea pacientul.");
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!lead) return;
    if (!confirm(`Ștergi definitiv leadul „${lead.name || lead.phone || "fără nume"}"? Notițele se șterg odată cu el.`)) {
      return;
    }
    try {
      const res = await secureFetch(`/api/admin/leads/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Nu am putut șterge.");
      router.push("/admin/leads");
    } catch (e) {
      setError((e as Error).message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-muted p-8 text-sm text-muted-foreground">Se încarcă…</div>
    );
  }
  if (!lead) {
    return (
      <div className="min-h-screen bg-muted p-8">
        <p className="text-sm text-red-700 mb-4">{error || "Leadul nu există."}</p>
        <Link href="/admin/leads" className="text-sm text-accent hover:underline">
          ← Înapoi la leaduri
        </Link>
      </div>
    );
  }

  const status = getStatus(lead.status);
  const source = getSource(lead.source);
  const open = !CLOSED_STATUSES.includes(lead.status as never);
  const wa = whatsAppLink(lead.phone);

  return (
    <div className="min-h-screen bg-muted">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        <Link href="/admin/leads" className="text-sm text-muted-foreground hover:text-foreground">
          ← Leaduri
        </Link>

        <header className="flex flex-wrap items-start justify-between gap-4 mt-3 mb-6">
          <div className="min-w-0">
            <h1 className="font-serif text-2xl sm:text-3xl font-medium text-foreground truncate">
              {lead.name || lead.phone || "Fără nume"}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className={`px-2 py-0.5 font-semibold ${source.className}`}>
                {source.emoji} {source.label}
              </span>
              <span>
                adăugat{" "}
                {new Date(lead.createdAt).toLocaleDateString("ro-RO", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setEditing((v) => !v)}
              className="border border-border bg-background text-sm font-semibold px-4 py-2 hover:border-foreground"
            >
              {editing ? "Anulează" : "Editează"}
            </button>
            <button
              onClick={remove}
              className="border border-red-200 text-red-600 text-sm font-semibold px-4 py-2 hover:bg-red-50"
            >
              Șterge
            </button>
          </div>
        </header>

        {error && (
          <div className="border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm mb-4">
            {error}
          </div>
        )}

        {editing ? (
          <div className="bg-background border border-border p-5 sm:p-8">
            <LeadForm
              lead={lead}
              staff={lead.staff}
              onCancel={() => setEditing(false)}
              onSaved={() => {
                setEditing(false);
                load();
              }}
            />
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <section className="bg-background border border-border p-5">
                <h2 className="font-semibold text-foreground mb-4">Date de contact</h2>
                <div className="grid sm:grid-cols-2 gap-4 text-sm">
                  <Field label="Nume">{lead.name || "—"}</Field>
                  <Field label="Telefon">
                    {lead.phone ? (
                      <a href={`tel:${lead.phone}`} className="text-accent hover:underline">
                        {lead.phone}
                      </a>
                    ) : (
                      "—"
                    )}
                  </Field>
                  {lead.email && (
                    <Field label="Email">
                      <a href={`mailto:${lead.email}`} className="text-accent hover:underline break-all">
                        {lead.email}
                      </a>
                    </Field>
                  )}
                  {lead.interestedIn && <Field label="Îl interesează">{lead.interestedIn}</Field>}
                  {lead.sourceDetail && (
                    <Field label={source.detailLabel}>{lead.sourceDetail}</Field>
                  )}
                  {lead.assignedToName && <Field label="Responsabil">{lead.assignedToName}</Field>}
                </div>
              </section>

              {lead.firstMessage && (
                <section className="bg-background border border-border p-5">
                  <h2 className="font-semibold text-foreground mb-3">Mesaj / context</h2>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {lead.firstMessage}
                  </p>
                </section>
              )}

              <section className="bg-background border border-border p-5">
                <h2 className="font-semibold text-foreground mb-3">Acțiuni rapide</h2>
                <div className="flex flex-wrap gap-2 text-sm font-semibold">
                  {lead.phone && (
                    <a
                      href={`tel:${lead.phone}`}
                      className="px-4 py-2 bg-foreground text-white hover:bg-foreground/90"
                    >
                      📞 Sună
                    </a>
                  )}
                  {wa && (
                    <a
                      href={wa}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 border border-green-300 text-green-700 hover:bg-green-50"
                    >
                      🟢 WhatsApp
                    </a>
                  )}
                  {lead.email && (
                    <a
                      href={`mailto:${lead.email}`}
                      className="px-4 py-2 border border-border hover:border-foreground"
                    >
                      ✉️ Email
                    </a>
                  )}
                  {lead.conversation && (
                    <Link
                      href={conversationHref(lead.conversation)}
                      className="px-4 py-2 border border-border hover:border-foreground"
                    >
                      💬 Vezi conversația
                    </Link>
                  )}
                  {lead.patient ? (
                    <Link
                      href="/admin/pacienti"
                      className="px-4 py-2 border border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                    >
                      ✅ Pacient: {lead.patient.name}
                    </Link>
                  ) : (
                    <button
                      onClick={convert}
                      disabled={busy}
                      className="px-4 py-2 border border-green-300 text-green-700 hover:bg-green-50 disabled:opacity-50"
                    >
                      → Creează pacient
                    </button>
                  )}
                </div>
              </section>

              <section className="bg-background border border-border p-5">
                <h2 className="font-semibold text-foreground mb-3">Istoric notițe</h2>
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  rows={3}
                  placeholder="Ce ați discutat? Ce urmează?"
                  className="w-full border border-border bg-background px-3 py-2 text-sm resize-none focus:border-foreground focus:outline-none"
                />
                <button
                  onClick={addNote}
                  disabled={busy || !noteText.trim()}
                  className="mt-2 bg-foreground text-white text-sm font-semibold px-4 py-2 disabled:opacity-50"
                >
                  Adaugă notiță
                </button>

                <div className="mt-4 space-y-2">
                  {lead.note && (
                    <div className="bg-muted p-3 text-sm flex items-start gap-2">
                      <p className="flex-1 whitespace-pre-wrap">{lead.note}</p>
                      <button
                        onClick={() => patch({ note: "" })}
                        aria-label="Șterge notița veche"
                        className="text-muted-foreground hover:text-red-600"
                      >
                        ×
                      </button>
                    </div>
                  )}
                  {lead.leadNotes.map((n) => (
                    <div key={n.id} className="bg-muted p-3 text-sm">
                      <div className="flex items-start gap-2">
                        <p className="flex-1 whitespace-pre-wrap">{n.content}</p>
                        <button
                          onClick={() => deleteNote(n.id)}
                          aria-label="Șterge notița"
                          className="text-muted-foreground hover:text-red-600"
                        >
                          ×
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {n.authorName ? `${n.authorName} · ` : ""}
                        {new Date(n.createdAt).toLocaleString("ro-RO", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  ))}
                  {!lead.note && lead.leadNotes.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-3">
                      Nicio notiță încă.
                    </p>
                  )}
                </div>
              </section>
            </div>

            <aside className="space-y-6">
              <section className="bg-background border border-border p-5">
                <h2 className="font-semibold text-foreground mb-3">Status</h2>
                <select
                  value={lead.status}
                  disabled={busy}
                  onChange={(e) => patch({ status: e.target.value })}
                  className={`w-full px-3 py-2.5 border-2 text-sm font-semibold ${status.className}`}
                >
                  {LEAD_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.emoji} {s.label}
                    </option>
                  ))}
                </select>
              </section>

              <section className="bg-background border border-border p-5">
                <h2 className="font-semibold text-foreground mb-3">Responsabil</h2>
                <select
                  value={lead.assignedToId ?? ""}
                  disabled={busy}
                  onChange={(e) => patch({ assignedToId: e.target.value || null })}
                  className={`${selectClass} w-full`}
                >
                  <option value="">Nimeni</option>
                  {lead.staff.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name || u.email}
                    </option>
                  ))}
                </select>
              </section>

              {open && (
                <section className="bg-background border border-border p-5">
                  <h2 className="font-semibold text-foreground mb-3">Recontactare</h2>
                  <input
                    type="date"
                    value={dayInput(lead.followUpAt)}
                    disabled={busy}
                    onChange={(e) => patch({ followUpAt: e.target.value || null })}
                    className={`${selectClass} w-full`}
                  />
                  <div className="flex gap-2 mt-2 text-xs">
                    {[1, 3, 7].map((d) => (
                      <button
                        key={d}
                        disabled={busy}
                        onClick={() => patch({ followUpAt: inDays(d) })}
                        className="px-2 py-1 border border-border text-muted-foreground hover:text-foreground"
                      >
                        +{d} zile
                      </button>
                    ))}
                    {lead.followUpAt && (
                      <button
                        disabled={busy}
                        onClick={() => patch({ followUpAt: null })}
                        className="px-2 py-1 text-muted-foreground hover:text-foreground"
                      >
                        elimină
                      </button>
                    )}
                  </div>
                </section>
              )}
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium text-foreground break-words">{children}</p>
    </div>
  );
}
