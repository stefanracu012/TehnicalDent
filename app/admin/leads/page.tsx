"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { secureFetch } from "@/lib/csrf-client";
import {
  CLOSED_STATUSES,
  LEAD_SOURCES,
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

const PAGE_SIZES = [25, 50, 100];

const FOLLOWUPS = [
  { value: "", label: "Follow-up: toate" },
  { value: "overdue", label: "🔴 Restante" },
  { value: "today", label: "🟠 Azi" },
  { value: "upcoming", label: "🔵 Urmează" },
  { value: "none", label: "⚪ Fără follow-up" },
];

const PERIODS = [
  { value: "", label: "Perioadă: toate" },
  { value: "today", label: "Azi" },
  { value: "yesterday", label: "Ieri" },
  { value: "week", label: "Săptămâna aceasta" },
  { value: "month", label: "Luna aceasta" },
  { value: "prev-month", label: "Luna trecută" },
  { value: "interval", label: "Interval…" },
];

const SORTS = [
  { value: "newest", label: "Cele mai noi" },
  { value: "oldest", label: "Cele mai vechi" },
  { value: "followup", label: "Follow-up apropiat" },
  { value: "name", label: "Nume (A–Z)" },
];

const FILTERS_KEY = "tehnicaldent:leads:filters";

interface Stats {
  total: number;
  overdue: number;
  byStatus: Record<string, number>;
}

const dayInput = (iso: string | null) => (iso ? iso.slice(0, 10) : "");
const inDays = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

const selectClass =
  "px-2 py-1.5 text-xs text-gray-900 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none";
// A filter that is on is coloured, so nobody wonders why leads are missing.
const activeSelectClass =
  "px-2 py-1.5 text-xs font-semibold text-indigo-800 border border-indigo-400 rounded-lg bg-indigo-50 ring-1 ring-indigo-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none";
const pick = (active: boolean) => (active ? activeSelectClass : selectClass);

const icon = "h-3.5 w-3.5";

function PencilIcon() {
  return (
    <svg className={icon} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className={icon} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
      />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`${icon} text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
    </svg>
  );
}

export default function AdminLeadsPage() {
  const [items, setItems] = useState<LeadItem[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, overdue: 0, byStatus: {} });
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [source, setSource] = useState("");
  const [assigned, setAssigned] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [period, setPeriod] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sort, setSort] = useState("newest");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");

  // Until the saved filters are read, ask for nothing: otherwise the first list
  // would be the unfiltered one, and flash.
  const [restored, setRestored] = useState(false);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<LeadItem | "new" | null>(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(FILTERS_KEY) || "null");
      if (saved) {
        if (Array.isArray(saved.statuses)) setStatuses(saved.statuses);
        if (typeof saved.source === "string") setSource(saved.source);
        if (typeof saved.assigned === "string") setAssigned(saved.assigned);
        if (typeof saved.followUp === "string") setFollowUp(saved.followUp);
        if (PERIODS.some((p) => p.value === saved.period)) setPeriod(saved.period);
        if (typeof saved.from === "string") setFrom(saved.from);
        if (typeof saved.to === "string") setTo(saved.to);
        if (SORTS.some((s) => s.value === saved.sort)) setSort(saved.sort);
        if (PAGE_SIZES.includes(saved.pageSize)) setPageSize(saved.pageSize);
      }
    } catch {
      // Private window or blocked storage — the page works without it.
    }
    setRestored(true);
  }, []);

  useEffect(() => {
    if (!restored) return;
    try {
      localStorage.setItem(
        FILTERS_KEY,
        JSON.stringify({ statuses, source, assigned, followUp, period, from, to, sort, pageSize }),
      );
    } catch {
      // Not essential.
    }
  }, [restored, statuses, source, assigned, followUp, period, from, to, sort, pageSize]);

  // Typing in the search box should not fire a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  // Any new filter starts again at the first page.
  useEffect(() => {
    setPage(1);
  }, [statuses, source, assigned, followUp, period, from, to, query, pageSize]);

  const params = useMemo(() => {
    const p = new URLSearchParams();
    if (statuses.length) p.set("status", statuses.join(","));
    if (source) p.set("source", source);
    if (assigned) p.set("assigned", assigned);
    if (followUp) p.set("followUp", followUp);
    if (period) p.set("period", period);
    if (period === "interval") {
      if (from) p.set("from", from);
      if (to) p.set("to", to);
    }
    if (query) p.set("q", query);
    p.set("sort", sort);
    p.set("page", String(page));
    p.set("pageSize", String(pageSize));
    return p;
  }, [statuses, source, assigned, followUp, period, from, to, query, sort, page, pageSize]);

  const load = useCallback(async () => {
    try {
      const res = await secureFetch(`/api/admin/leads?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Eroare la încărcare");
      setItems(data.leads ?? []);
      setStats(data.stats ?? { total: 0, overdue: 0, byStatus: {} });
      setTotalCount(data.totalCount ?? 0);
      setTotalPages(data.totalPages ?? 1);
      setStaff(data.staff ?? []);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    if (restored) load();
  }, [restored, load]);

  const patchLocal = (id: string, patch: Partial<LeadItem>) =>
    setItems((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));

  /** Saves one change, showing it at once and putting it back if refused. */
  const patch = async (lead: LeadItem, data: Partial<LeadItem>) => {
    const before = { ...lead };
    patchLocal(lead.id, data);
    try {
      const res = await secureFetch(`/api/admin/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Nu am putut salva.");
      // Moving to Pacient creates the patient — take what the server settled on.
      if (body.converted) patchLocal(lead.id, { status: body.status, patientId: body.patientId });
      setError(null);
    } catch (e) {
      patchLocal(lead.id, before);
      setError((e as Error).message);
    }
  };

  const remove = async (lead: LeadItem) => {
    if (
      !confirm(
        `Ștergi leadul „${lead.name || lead.phone || "fără nume"}"? Notițele lui se șterg odată cu el. Pacientul creat din el, dacă există, rămâne.`,
      )
    ) {
      return;
    }
    try {
      const res = await secureFetch(`/api/admin/leads/${lead.id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Nu am putut șterge.");
      }
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const toggleStatus = (value: string) =>
    setStatuses((prev) => (prev.includes(value) ? prev.filter((s) => s !== value) : [...prev, value]));

  const filterCount = statuses.length + [source, assigned, followUp, period, query].filter(Boolean).length;

  const resetAll = () => {
    setStatuses([]);
    setSource("");
    setAssigned("");
    setFollowUp("");
    setPeriod("");
    setFrom("");
    setTo("");
    setSearch("");
    setSort("newest");
  };

  // 1 … 4 5 [6] 7 8 … 20 — only as many buttons as fit the eye.
  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const out: (number | "…")[] = [1];
    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);
    if (start > 2) out.push("…");
    for (let i = start; i <= end; i++) out.push(i);
    if (end < totalPages - 1) out.push("…");
    out.push(totalPages);
    return out;
  }, [page, totalPages]);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="min-h-full bg-gray-50 p-3 sm:p-4 lg:p-5 space-y-2.5">
      {/* Title and counts on one row */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-bold text-gray-900">Leaduri</h1>
        <div className="flex flex-wrap items-center gap-1.5">
          <StatChip label="Total" value={stats.total} />
          <button
            type="button"
            onClick={() => setStatuses(statuses.length === 1 && statuses[0] === "urgent" ? [] : ["urgent"])}
            title="Arată doar conversațiile la care trebuie să răspundă cineva"
          >
            <span
              className={`inline-flex items-baseline gap-1 px-2 py-1 rounded-lg border ${
                (stats.byStatus.urgent ?? 0) > 0
                  ? "bg-red-600 border-red-700 text-white animate-pulse"
                  : "bg-white border-gray-200 text-gray-500"
              }`}
            >
              <span className="text-[10px]">🚨 Urgente</span>
              <span className="text-xs font-bold">{stats.byStatus.urgent ?? 0}</span>
            </span>
          </button>
          <StatChip label="🔵 Noi" value={stats.byStatus.nou ?? 0} color="text-blue-600" />
          <StatChip label="📅 Programați" value={stats.byStatus.programat ?? 0} color="text-sky-700" />
          <StatChip label="✅ Pacienți" value={stats.byStatus.convertit ?? 0} color="text-emerald-600" />
          <button
            type="button"
            onClick={() => setFollowUp(followUp === "overdue" ? "" : "overdue")}
            title="Arată doar follow-up-urile restante"
          >
            <StatChip label="🔴 Restante" value={stats.overdue} color="text-red-600" />
          </button>
          <button
            type="button"
            onClick={() => setEditing("new")}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 transition-colors"
          >
            + Lead nou
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-xs">
          {error}
        </div>
      )}

      {/* One bar: status pills, search and filters */}
      <div
        className={`rounded-lg border px-2 py-2 flex flex-wrap items-center gap-1.5 transition-colors ${
          filterCount > 0 ? "bg-indigo-50/60 border-indigo-300" : "bg-white border-gray-200"
        }`}
      >
        <button
          onClick={() => setStatuses([])}
          className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
            statuses.length === 0
              ? "bg-indigo-600 text-white"
              : "bg-gray-50 text-gray-700 border border-gray-200 hover:border-indigo-400"
          }`}
        >
          Toate
        </button>
        {LEAD_STATUSES.map((s) => {
          const on = statuses.includes(s.value);
          return (
            <button
              key={s.value}
              onClick={() => toggleStatus(s.value)}
              title={on ? `${s.label} — apasă din nou ca să scoți filtrul` : s.label}
              className={`px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                on
                  ? "bg-indigo-600 text-white ring-2 ring-indigo-200"
                  : "bg-gray-50 text-gray-700 border border-gray-200 hover:border-indigo-400"
              }`}
            >
              {s.emoji} {s.label}
              {on && <span className="ml-1 opacity-80">×</span>}
            </button>
          );
        })}

        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Caută…"
          className="w-44 px-2.5 py-1.5 text-xs text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
        <select
          value={source}
          onChange={(e) => setSource(e.target.value)}
          className={pick(!!source)}
          aria-label="Sursă"
        >
          <option value="">Sursă: toate</option>
          {LEAD_SOURCES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.emoji} {s.label}
            </option>
          ))}
        </select>
        <select
          value={assigned}
          onChange={(e) => setAssigned(e.target.value)}
          className={pick(!!assigned)}
          aria-label="Responsabil"
        >
          <option value="">Responsabil: toți</option>
          <option value="none">Fără responsabil</option>
          {staff.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name || u.email}
            </option>
          ))}
        </select>
        <select
          value={followUp}
          onChange={(e) => setFollowUp(e.target.value)}
          className={pick(!!followUp)}
          aria-label="Follow-up"
        >
          {FOLLOWUPS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className={pick(!!period)}
          aria-label="Perioadă"
        >
          {PERIODS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
        {period === "interval" && (
          <span className="flex items-center gap-1">
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className={pick(!!from)}
              aria-label="De la data"
            />
            <span className="text-gray-400 text-xs">→</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className={pick(!!to)}
              aria-label="Până la data"
            />
          </span>
        )}
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className={pick(sort !== "newest")}
          aria-label="Sortare"
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        <span className="ml-auto flex items-center gap-2 text-[11px] text-gray-500">
          {loading
            ? "se încarcă…"
            : totalCount === stats.total
              ? `${totalCount} leaduri`
              : `${totalCount} din ${stats.total}`}
          {filterCount > 0 && (
            <>
              <span className="px-1.5 py-0.5 rounded-full bg-indigo-600 text-white font-semibold">
                {filterCount} {filterCount === 1 ? "filtru" : "filtre"}
              </span>
              <button onClick={resetAll} className="text-indigo-600 hover:text-indigo-800 font-medium">
                × Resetează
              </button>
            </>
          )}
        </span>
      </div>

      {/* The list */}
      {loading && items.length === 0 ? (
        <div className="space-y-1">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="bg-white border border-gray-100 rounded-lg px-3 py-3 animate-pulse flex items-center gap-3"
            >
              <div className="h-4 w-4 rounded bg-gray-100" />
              <div className="h-3 bg-gray-100 rounded w-40" />
              <div className="h-3 bg-gray-100 rounded w-24" />
              <div className="h-3 bg-gray-100 rounded w-16 ml-auto" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-lg p-6 text-center border border-gray-200">
          <p className="text-sm text-gray-500">
            {filterCount > 0
              ? "Niciun lead nu corespunde filtrelor."
              : "Niciun lead încă — apar singuri când cineva scrie, sau adaugă primul cu butonul „Lead nou”."}
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {items.map((lead) => (
            <LeadRow
              key={lead.id}
              lead={lead}
              staff={staff}
              today={today}
              expanded={expandedId === lead.id}
              onToggle={() => setExpandedId(expandedId === lead.id ? null : lead.id)}
              onPatch={(data) => patch(lead, data)}
              onEdit={() => setEditing(lead)}
              onDelete={() => remove(lead)}
              onNotesChange={(count) => patchLocal(lead.id, { notesCount: count })}
              onError={setError}
            />
          ))}
        </div>
      )}

      {/* Paging */}
      {!loading && totalCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>Pe pagină:</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className={selectClass}
              aria-label="Leaduri pe pagină"
            >
              {PAGE_SIZES.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <span>
              {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalCount)} din {totalCount}
            </span>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page === 1}
                className="px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
              >
                ‹ Înapoi
              </button>
              {pageNumbers.map((n, i) =>
                n === "…" ? (
                  <span key={`gap-${i}`} className="px-1 text-gray-400 text-xs">
                    …
                  </span>
                ) : (
                  <button
                    key={n}
                    onClick={() => setPage(n)}
                    className={`min-w-[2rem] px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      n === page
                        ? "bg-indigo-600 text-white"
                        : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {n}
                  </button>
                ),
              )}
              <button
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                disabled={page === totalPages}
                className="px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
              >
                Înainte ›
              </button>
            </div>
          )}
        </div>
      )}

      {editing && (
        <Modal
          title={editing === "new" ? "Lead nou" : `Editează: ${editing.name || editing.phone || "lead"}`}
          subtitle={
            editing === "new"
              ? "Telefon, Instagram, WhatsApp, Messenger sau recomandare"
              : "Modifică datele, statusul sau follow-up-ul"
          }
          onClose={() => setEditing(null)}
        >
          <LeadForm
            lead={editing === "new" ? null : editing}
            staff={staff}
            onCancel={() => setEditing(null)}
            onSaved={() => {
              setEditing(null);
              load();
            }}
          />
        </Modal>
      )}
    </div>
  );
}

function StatChip({ label, value, color = "text-gray-900" }: { label: string; value: number; color?: string }) {
  return (
    <span className="inline-flex items-baseline gap-1 px-2 py-1 rounded-lg bg-white border border-gray-200">
      <span className="text-[10px] text-gray-500">{label}</span>
      <span className={`text-xs font-bold ${color}`}>{value}</span>
    </span>
  );
}

function Modal({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-start justify-center p-3 sm:p-6">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className="relative bg-white rounded-2xl shadow-xl w-full max-w-3xl my-2 sm:my-4"
        >
          <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 sm:px-6 py-3 flex items-start justify-between gap-3 rounded-t-2xl">
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 truncate">{title}</h2>
              {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
            </div>
            <button
              onClick={onClose}
              aria-label="Închide"
              className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 leading-none"
            >
              ✕
            </button>
          </div>
          <div className="p-4 sm:p-6">{children}</div>
        </div>
      </div>
    </div>
  );
}

function LeadRow({
  lead,
  staff,
  today,
  expanded,
  onToggle,
  onPatch,
  onEdit,
  onDelete,
  onNotesChange,
  onError,
}: {
  lead: LeadItem;
  staff: StaffMember[];
  today: string;
  expanded: boolean;
  onToggle: () => void;
  onPatch: (data: Partial<LeadItem>) => void;
  onEdit: () => void;
  onDelete: () => void;
  onNotesChange: (count: number) => void;
  onError: (message: string) => void;
}) {
  const router = useRouter();
  const status = getStatus(lead.status);
  const source = getSource(lead.source);
  const open = !CLOSED_STATUSES.includes(lead.status as never);
  const due = open && lead.followUpAt != null && dayInput(lead.followUpAt) <= today;
  const isToday = open && lead.followUpAt != null && dayInput(lead.followUpAt) === today;
  const wa = whatsAppLink(lead.phone);

  const [notes, setNotes] = useState<LeadNoteItem[] | null>(null);
  const [noteText, setNoteText] = useState("");
  const [busy, setBusy] = useState(false);

  // Notes are loaded when the row is opened, not for every row in the list.
  useEffect(() => {
    if (!expanded) return;
    let cancelled = false;
    secureFetch(`/api/admin/lead-notes?leadId=${lead.id}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => !cancelled && setNotes(Array.isArray(d) ? d : []))
      .catch(() => !cancelled && setNotes([]));
    return () => {
      cancelled = true;
    };
  }, [expanded, lead.id]);

  const addNote = async () => {
    const content = noteText.trim();
    if (!content) return;
    setBusy(true);
    try {
      const res = await secureFetch("/api/admin/lead-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: lead.id, content }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Nu am putut salva notița.");
      const next = [data as LeadNoteItem, ...(notes ?? [])];
      setNotes(next);
      setNoteText("");
      onNotesChange(next.length);
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const deleteNote = async (id: string) => {
    try {
      const res = await secureFetch(`/api/admin/lead-notes/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Nu am putut șterge notița.");
      const next = (notes ?? []).filter((n) => n.id !== id);
      setNotes(next);
      onNotesChange(next.length);
    } catch (e) {
      onError((e as Error).message);
    }
  };

  const convert = async () => {
    if (!lead.phone) {
      onError("Adaugă întâi numărul de telefon — un pacient fără telefon nu poate fi creat.");
      return;
    }
    if (!confirm(`Creezi pacientul ${lead.name || lead.phone}?`)) return;
    setBusy(true);
    try {
      const res = await secureFetch(`/api/admin/leads/${lead.id}/convert`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Nu am putut crea pacientul.");
      if (data.reused) {
        alert("Exista deja un pacient cu acest număr — leadul a fost legat de el.");
      }
      router.push("/admin/pacienti");
    } catch (e) {
      onError((e as Error).message);
      setBusy(false);
    }
  };

  const border = expanded
    ? "border-indigo-400 shadow-sm"
    : lead.status === "urgent"
      ? "border-red-400 bg-red-50/60 hover:border-red-500"
      : due
      ? "border-red-300 hover:border-indigo-300"
      : status.group === "nou"
        ? "border-blue-300 hover:border-indigo-300"
        : "border-gray-200 hover:border-indigo-300";

  return (
    <div
      className={`rounded-lg border transition-colors ${
        lead.status === "urgent" && !expanded ? "" : "bg-white"
      } ${border}`}
    >
      <div className="flex items-stretch">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          className="flex-1 text-left px-2 py-1 flex items-center gap-1.5 min-w-0 text-[13px]"
        >
          <span title={status.label} className="leading-none shrink-0">
            {status.emoji}
          </span>
          <span className="font-medium text-gray-900 truncate min-w-0 max-w-[42%] sm:max-w-none">
            {lead.name || "Fără nume"}
          </span>
          <span
            className={`hidden md:inline shrink-0 px-1.5 rounded text-[10px] font-medium ${source.className}`}
          >
            {source.emoji} {source.label}
          </span>
          {lead.phone && (
            <span className="hidden lg:inline shrink-0 text-xs text-gray-500 tabular-nums">
              📞 {lead.phone}
            </span>
          )}
          {lead.interestedIn && (
            <span className="hidden xl:inline truncate px-1 rounded bg-gray-100 text-gray-600 text-[10px] font-medium">
              {lead.interestedIn}
            </span>
          )}

          <span className="ml-auto flex items-center gap-1.5 shrink-0 text-[11px] text-gray-400 whitespace-nowrap">
            {lead.followUpAt && open && (
              <span
                title={`Follow-up: ${new Date(lead.followUpAt).toLocaleDateString("ro-RO")}`}
                className={
                  due && !isToday
                    ? "text-red-600 font-semibold"
                    : isToday
                      ? "text-orange-600 font-semibold"
                      : "text-blue-600"
                }
              >
                🔔{" "}
                {new Date(lead.followUpAt).toLocaleDateString("ro-RO", {
                  day: "numeric",
                  month: "short",
                })}
              </span>
            )}
            {(lead.notesCount ?? 0) > 0 && (
              <span title={`${lead.notesCount} notițe`}>📝{lead.notesCount}</span>
            )}
            <span className="hidden sm:inline">
              {new Date(lead.createdAt).toLocaleDateString("ro-RO", {
                day: "numeric",
                month: "short",
              })}
            </span>
            <ChevronIcon open={expanded} />
          </span>
        </button>

        {/* Status, editable straight from the list */}
        <select
          value={lead.status}
          onChange={(e) => onPatch({ status: e.target.value })}
          onClick={(e) => e.stopPropagation()}
          title="Schimbă statusul"
          className={`shrink-0 max-w-[9rem] px-1 py-0.5 my-1 rounded border text-[10px] font-medium cursor-pointer focus:ring-2 focus:ring-indigo-500 ${status.className}`}
        >
          {LEAD_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.emoji} {s.label}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-0.5 px-1.5 shrink-0">
          <button
            type="button"
            onClick={onEdit}
            title="Editează"
            aria-label="Editează leadul"
            className="p-1 rounded text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
          >
            <PencilIcon />
          </button>
          <button
            type="button"
            onClick={onDelete}
            title="Șterge"
            aria-label="Șterge leadul"
            className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
          >
            <TrashIcon />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-2 pb-2.5 pt-1.5 border-t border-gray-100 space-y-2.5 text-xs">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-3 gap-y-1.5">
            {lead.phone && (
              <Detail label="Telefon">
                <a href={`tel:${lead.phone}`} className="text-indigo-600 hover:underline tabular-nums">
                  {lead.phone}
                </a>
              </Detail>
            )}
            {lead.email && (
              <Detail label="Email">
                <a href={`mailto:${lead.email}`} className="text-indigo-600 hover:underline break-all">
                  {lead.email}
                </a>
              </Detail>
            )}
            {lead.interestedIn && <Detail label="Îl interesează">{lead.interestedIn}</Detail>}
            {lead.sourceDetail && <Detail label={source.detailLabel}>{lead.sourceDetail}</Detail>}
            <Detail label="Adăugat">
              {new Date(lead.createdAt).toLocaleString("ro-RO", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Detail>
          </div>

          {lead.firstMessage && (
            <p className="bg-gray-50 rounded-lg p-2 text-gray-700 whitespace-pre-wrap">
              💬 {lead.firstMessage}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <label className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-wide text-gray-400">Responsabil</span>
              <select
                value={lead.assignedToId ?? ""}
                onChange={(e) => onPatch({ assignedToId: e.target.value || null })}
                className={selectClass}
              >
                <option value="">Nimeni</option>
                {staff.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name || u.email}
                  </option>
                ))}
              </select>
              <span className="text-[10px] text-gray-400">primește reminderele pe Telegram</span>
            </label>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-wide text-gray-400">Recontactare</span>
              <input
                type="date"
                value={dayInput(lead.followUpAt)}
                onChange={(e) => onPatch({ followUpAt: e.target.value || null })}
                className={selectClass}
              />
              {[1, 3, 7].map((d) => (
                <button
                  key={d}
                  onClick={() => onPatch({ followUpAt: inDays(d) })}
                  className="px-1.5 py-0.5 rounded border border-gray-200 text-[11px] text-gray-600 hover:border-indigo-400 hover:text-indigo-600"
                >
                  +{d}z
                </button>
              ))}
              {lead.followUpAt && (
                <button
                  onClick={() => onPatch({ followUpAt: null })}
                  className="px-1.5 py-0.5 text-[11px] text-gray-400 hover:text-gray-700"
                >
                  elimină
                </button>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex gap-1.5">
              <input
                type="text"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addNote();
                  }
                }}
                placeholder="Notiță rapidă… (Enter pentru salvare)"
                className="flex-1 px-2 py-1 text-xs text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none"
              />
              <button
                onClick={addNote}
                disabled={busy || !noteText.trim()}
                className="px-2.5 py-1 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                Adaugă
              </button>
            </div>

            {lead.note && (
              <p className="flex items-start gap-1.5 bg-gray-50 rounded-lg px-2 py-1">
                <span className="flex-1 text-gray-700 whitespace-pre-wrap">{lead.note}</span>
                <button
                  onClick={() => onPatch({ note: "" })}
                  aria-label="Șterge notița veche"
                  className="text-gray-300 hover:text-red-600"
                >
                  ×
                </button>
              </p>
            )}

            {notes === null ? (
              <p className="text-[11px] text-gray-400">Se încarcă notițele…</p>
            ) : (
              notes.map((n) => (
                <p key={n.id} className="flex items-start gap-1.5 bg-gray-50 rounded-lg px-2 py-1">
                  <span className="flex-1 text-gray-700 whitespace-pre-wrap">{n.content}</span>
                  <span className="text-[10px] text-gray-400 whitespace-nowrap">
                    {new Date(n.createdAt).toLocaleDateString("ro-RO", {
                      day: "numeric",
                      month: "short",
                    })}
                    {n.authorName ? ` · ${n.authorName}` : ""}
                  </span>
                  <button
                    onClick={() => deleteNote(n.id)}
                    aria-label="Șterge notița"
                    className="text-gray-300 hover:text-red-600"
                  >
                    ×
                  </button>
                </p>
              ))
            )}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {lead.phone && (
              <a
                href={`tel:${lead.phone}`}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-600 text-white text-[11px] font-medium hover:bg-indigo-700 transition-colors"
              >
                📞 Sună
              </a>
            )}
            {wa && (
              <a
                href={wa}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-green-600 text-white text-[11px] font-medium hover:bg-green-700 transition-colors"
              >
                🟢 WhatsApp
              </a>
            )}
            {lead.conversation && (
              <Link
                href={conversationHref(lead.conversation)}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-sky-600 text-white text-[11px] font-medium hover:bg-sky-700 transition-colors"
              >
                💬 Vezi conversația
              </Link>
            )}
            {lead.patientId ? (
              <Link
                href="/admin/pacienti"
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-emerald-300 text-emerald-700 text-[11px] font-medium hover:bg-emerald-50 transition-colors"
              >
                ✅ Este pacient
              </Link>
            ) : (
              <button
                onClick={convert}
                disabled={busy}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-teal-600 text-white text-[11px] font-medium hover:bg-teal-700 transition-colors disabled:opacity-50"
              >
                → Pacient
              </button>
            )}
            <Link
              href={`/admin/leads/${lead.id}`}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-indigo-300 text-indigo-700 text-[11px] font-medium hover:bg-indigo-50 transition-colors"
            >
              Fișa completă ↗
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-wide text-gray-400">{label}</p>
      <p className="text-gray-800 font-medium break-words">{children}</p>
    </div>
  );
}
