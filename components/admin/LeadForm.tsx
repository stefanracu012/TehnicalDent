"use client";

import { useEffect, useState } from "react";
import { secureFetch } from "@/lib/csrf-client";
import { LEAD_SOURCES, LEAD_STATUSES, getSource } from "@/lib/leads-config";
import type { LeadItem, StaffMember } from "./lead-types";

const input =
  "w-full border border-gray-300 rounded-lg bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none";
const label = "block text-xs font-semibold text-gray-500 mb-1";

/** The day part of a stored date, for <input type="date">. */
const dayInput = (iso: string | null | undefined) => (iso ? iso.slice(0, 10) : "");

/**
 * A lead's form: create (no `lead`) or edit (with one).
 *
 * Which sources can be chosen depends on where the lead came from: one that
 * arrived through Messenger, Instagram, WhatsApp or the site form keeps that
 * source, because the inbox finds its conversation by it.
 */
export default function LeadForm({
  lead = null,
  staff,
  onSaved,
  onCancel,
}: {
  lead?: LeadItem | null;
  staff: StaffMember[];
  onSaved: (lead: LeadItem) => void;
  onCancel: () => void;
}) {
  const sourceLocked =
    lead != null && !(getSource(lead.source).manual || lead.source === "manual");

  const [form, setForm] = useState({
    name: lead?.name ?? "",
    phone: lead?.phone ?? "",
    email: lead?.email ?? "",
    source: lead?.source ?? "telefon",
    sourceDetail: lead?.sourceDetail ?? "",
    interestedIn: lead?.interestedIn ?? "",
    status: lead?.status ?? "nou",
    assignedToId: lead?.assignedToId ?? "",
    followUpAt: dayInput(lead?.followUpAt),
    firstMessage: lead?.firstMessage ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState<string | null>(null);

  const set = (key: keyof typeof form, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  // Same person, second lead: say so while the form is still open.
  useEffect(() => {
    const digits = form.phone.replace(/\D/g, "");
    if (digits.length < 7) {
      setDuplicate(null);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await secureFetch(
          `/api/admin/leads?q=${encodeURIComponent(form.phone)}&pageSize=25`,
        );
        const data = await res.json();
        const others = ((data.leads ?? []) as LeadItem[]).filter((l) => l.id !== lead?.id);
        setDuplicate(
          others.length > 0
            ? `Există deja ${others.length === 1 ? "un lead" : `${others.length} leaduri`} cu acest număr: ${others
                .slice(0, 3)
                .map((l) => l.name || l.phone)
                .join(", ")}.`
            : null,
        );
      } catch {
        setDuplicate(null);
      }
    }, 450);
    return () => clearTimeout(timer);
  }, [form.phone, lead?.id]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() && !form.phone.trim()) {
      setError("Adaugă măcar un nume sau un telefon.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        sourceDetail: form.sourceDetail.trim(),
        interestedIn: form.interestedIn.trim(),
        status: form.status,
        assignedToId: form.assignedToId || null,
        followUpAt: form.followUpAt || null,
        firstMessage: form.firstMessage.trim(),
        ...(sourceLocked ? {} : { source: form.source }),
      };

      const res = await secureFetch(
        lead ? `/api/admin/leads/${lead.id}` : "/api/admin/leads",
        {
          method: lead ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Nu am putut salva.");
      onSaved(data as LeadItem);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const source = getSource(form.source);

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-900">Persoana de contact</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className={label}>Nume</label>
            <input
              className={input}
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="ex: Maria Popescu"
            />
          </div>
          <div>
            <label className={label}>Telefon</label>
            <input
              className={input}
              type="tel"
              inputMode="tel"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="060 123 456"
            />
          </div>
          <div>
            <label className={label}>Email</label>
            <input
              className={input}
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="opțional"
            />
          </div>
        </div>
        {duplicate && (
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            {duplicate}
          </p>
        )}
      </section>

      <section className="space-y-3 pt-4 border-t border-gray-100">
        <h2 className="text-sm font-semibold text-gray-900">De unde a venit</h2>
        {sourceLocked ? (
          <p className="text-sm text-gray-500">
            {source.emoji} {source.label} — leadul a venit singur din acest canal și
            rămâne legat de conversația lui.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {LEAD_SOURCES.filter((s) => s.manual || s.value === form.source).map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => set("source", s.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                  form.source === s.value
                    ? "bg-indigo-600 text-white border-indigo-400"
                    : "bg-white text-gray-500 border-gray-200 hover:text-gray-900"
                }`}
              >
                {s.emoji} {s.label}
              </button>
            ))}
          </div>
        )}
        <div>
          <label className={label}>{source.detailLabel}</label>
          <input
            className={input}
            value={form.sourceDetail}
            onChange={(e) => set("sourceDetail", e.target.value)}
            placeholder="opțional"
          />
        </div>
      </section>

      <section className="space-y-3 pt-4 border-t border-gray-100">
        <h2 className="text-sm font-semibold text-gray-900">Stadiu</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className={label}>Status</label>
            <select
              className={input}
              value={form.status}
              onChange={(e) => set("status", e.target.value)}
            >
              {LEAD_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.emoji} {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={label}>Responsabil</label>
            <select
              className={input}
              value={form.assignedToId}
              onChange={(e) => set("assignedToId", e.target.value)}
            >
              <option value="">Nimeni</option>
              {staff.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name || u.email}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Primește leadul și reminderele de recontactare pe Telegram, în privat — dacă și-a
              conectat Telegram din Contul meu.
            </p>
          </div>
          <div>
            <label className={label}>Recontactează pe</label>
            <input
              className={input}
              type="date"
              value={form.followUpAt}
              onChange={(e) => set("followUpAt", e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className={label}>Ce îl interesează</label>
          <input
            className={input}
            value={form.interestedIn}
            onChange={(e) => set("interestedIn", e.target.value)}
            placeholder="ex: implant, albire, control, durere de dinte"
          />
        </div>
        <div>
          <label className={label}>Mesaj / context</label>
          <textarea
            className={`${input} resize-none`}
            rows={3}
            value={form.firstMessage}
            onChange={(e) => set("firstMessage", e.target.value)}
            placeholder="Ce a scris sau ce ați discutat…"
          />
        </div>
      </section>

      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="flex gap-3 pt-1">
        <button
          type="submit"
          disabled={saving}
          className="bg-indigo-600 text-white text-sm font-semibold px-5 py-2.5 hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          {saving ? "Se salvează…" : lead ? "Salvează" : "Adaugă lead"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="border border-gray-200 rounded-lg text-sm font-semibold px-5 py-2.5 text-gray-500 hover:text-gray-900 transition-colors"
        >
          Anulează
        </button>
      </div>
    </form>
  );
}
