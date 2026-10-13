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
  "border border-border bg-background px-2 py-1.5 text-xs text-foreground focus:border-foreground focus:outline-none";
const activeSelectClass =
  "border border-foreground bg-foreground/5 px-2 py-1.5 text-xs font-semibold text-foreground focus:outline-none";

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
    if (!confirm(`Ștergi leadul „${lead.name || lead.phone || "fără nume"}"? Notițele lui se șterg odată cu el. Pacientul creat din el, dacă există, rămâne.`)) {
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

  const filterCount =
    statuses.length +
    [source, assigned, followUp, period, query].filter(Boolean).length;

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

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="min-h-screen bg-muted">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        <header className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-medium text-foreground">
              Leaduri
            </h1>
            <p className="mt-1 text-sm text-muted-foreground max-w-xl">
              Oameni care au scris și încă nu sunt pacienți. Apar singuri din Messenger,
              Instagram, WhatsApp și formularul de pe site.
            </p>
          </div>
          <button
            onClick={() => setEditing("new")}
            className="bg-foreground text-white text-sm font-semibold px-5 py-2.5 hover:bg-foreground/90 transition-colors"
          >
            + Lead nou
          </button>
        </header>

        <div className="flex flex-wrap gap-2 mb-4 text-xs">
          <Stat label="Total" value={stats.total} />
          <Stat label="🔵 Noi" value={stats.byStatus.nou ?? 0} />
          <Stat label="📅 Programați" value={stats.byStatus.programat ?? 0} />
          <Stat label="✅ Pacienți" value={stats.byStatus.convertit ?? 0} />
          <button
            onClick={() => {
              setFollowUp(followUp === "overdue" ? "" : "overdue");
            }}
            className={`px-3 py-1.5 border font-semibold ${
              stats.overdue > 0
                ? "border-red-300 bg-red-50 text-red-700"
                : "border-border bg-background text-muted-foreground"
            }`}
          >
            🔴 Restante {stats.overdue}
          </button>
        </div>

        {error && (
          <div className="border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm mb-4">
            {error}
          </div>
        )}

        <div
          className={`border px-3 py-3 mb-4 flex flex-wrap items-center gap-2 ${
            filterCount > 0 ? "border-foreground bg-background" : "border-border bg-background"
          }`}
        >
          <button
            onClick={() => setStatuses([])}
            className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${
              statuses.length === 0
                ? "bg-foreground text-white"
                : "border border-border text-muted-foreground hover:text-foreground"
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
                title={on ? "Apasă din nou ca să scoți filtrul" : s.label}
                className={`px-2.5 py-1 text-xs font-semibold rounded-full transition-colors ${
                  on
                    ? "bg-foreground text-white"
                    : "border border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {s.emoji} {s.label}
                <span className="ml-1 opacity-60">{stats.byStatus[s.value] ?? 0}</span>
              </button>
            );
          })}

          <div className="flex flex-wrap items-center gap-2 w-full pt-2">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Caută nume, telefon, mesaj…"
              className="border border-border bg-background px-3 py-1.5 text-xs w-56 focus:border-foreground focus:outline-none"
            />
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className={source ? activeSelectClass : selectClass}
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
              className={assigned ? activeSelectClass : selectClass}
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
              className={followUp ? activeSelectClass : selectClass}
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
              className={period ? activeSelectClass : selectClass}
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
                  className={selectClass}
                  aria-label="De la data"
                />
                <span className="text-muted-foreground">→</span>
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className={selectClass}
                  aria-label="Până la data"
                />
              </span>
            )}
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className={sort !== "newest" ? activeSelectClass : selectClass}
              aria-label="Sortare"
            >
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>

            <span className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
              {loading
                ? "se încarcă…"
                : totalCount === stats.total
                  ? `${totalCount} leaduri`
                  : `${totalCount} din ${stats.total}`}
              {filterCount > 0 && (
                <button onClick={resetAll} className="font-semibold text-foreground hover:underline">
                  Resetează filtrele
                </button>
              )}
            </span>
          </div>
        </div>

        {loading && items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Se încarcă…</p>
        ) : items.length === 0 ? (
          <div className="bg-background border border-border p-10 text-center text-muted-foreground text-sm">
            {filterCount > 0
              ? "Niciun lead nu corespunde filtrelor."
              : "Niciun lead încă. Apar singuri când cineva scrie, sau le poți adăuga cu butonul de sus."}
          </div>
        ) : (
          <div className="space-y-2">
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

        {!loading && totalCount > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 mt-5 text-xs text-muted-foreground">
            <label className="flex items-center gap-2">
              Pe pagină
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className={selectClass}
              >
                {PAGE_SIZES.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  disabled={page <= 1}
                  className="px-3 py-1.5 border border-border bg-background disabled:opacity-40"
                >
                  ← Înapoi
                </button>
                <span>
                  Pagina {page} din {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                  disabled={page >= totalPages}
                  className="px-3 py-1.5 border border-border bg-background disabled:opacity-40"
                >
                  Înainte →
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {editing && (
        <Modal
          title={editing === "new" ? "Lead nou" : `Editează: ${editing.name || editing.phone || "lead"}`}
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

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <span className="px-3 py-1.5 border border-border bg-background text-muted-foreground">
      {label} <b className="text-foreground">{value}</b>
    </span>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-start justify-center p-4 sm:p-8">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className="relative bg-background border border-border w-full max-w-3xl p-5 sm:p-8"
        >
          <div className="flex items-start justify-between gap-3 mb-5">
            <h2 className="font-serif text-xl font-medium text-foreground">{title}</h2>
            <button
              onClick={onClose}
              aria-label="Închide"
              className="text-muted-foreground hover:text-foreground text-lg leading-none"
            >
              ×
            </button>
          </div>
          {children}
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

  return (
    <div
      className={`bg-background border ${
        expanded ? "border-foreground" : due ? "border-red-300" : "border-border"
      }`}
    >
      <div className="flex items-stretch">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          className="flex-1 min-w-0 text-left px-3 py-2.5 flex flex-wrap items-center gap-x-3 gap-y-1"
        >
          <span title={status.label}>{status.emoji}</span>
          <span className="font-medium text-foreground truncate max-w-[16rem]">
            {lead.name || "Fără nume"}
          </span>
          <span className={`hidden sm:inline px-1.5 py-0.5 text-[10px] font-semibold ${source.className}`}>
            {source.emoji} {source.label}
          </span>
          {lead.phone && (
            <span className="hidden md:inline text-xs text-muted-foreground tabular-nums">
              {lead.phone}
            </span>
          )}
          {lead.interestedIn && (
            <span className="hidden lg:inline text-xs text-muted-foreground truncate max-w-[14rem]">
              {lead.interestedIn}
            </span>
          )}
          <span className="ml-auto flex items-center gap-3 text-[11px] text-muted-foreground whitespace-nowrap">
            {lead.followUpAt && open && (
              <span className={due ? "font-semibold text-red-600" : ""}>
                🔔{" "}
                {new Date(lead.followUpAt).toLocaleDateString("ro-RO", {
                  day: "numeric",
                  month: "short",
                })}
              </span>
            )}
            {(lead.notesCount ?? 0) > 0 && <span>📝 {lead.notesCount}</span>}
            <span>
              {new Date(lead.createdAt).toLocaleDateString("ro-RO", {
                day: "numeric",
                month: "short",
              })}
            </span>
          </span>
        </button>

        <select
          value={lead.status}
          onChange={(e) => onPatch({ status: e.target.value })}
          title="Schimbă statusul"
          className={`self-center mr-2 max-w-[10rem] px-1.5 py-1 border text-[11px] font-semibold cursor-pointer ${status.className}`}
        >
          {LEAD_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.emoji} {s.label}
            </option>
          ))}
        </select>
      </div>

      {expanded && (
        <div className="border-t border-border px-3 py-4 space-y-4 text-sm">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-3">
            {lead.phone && (
              <Detail label="Telefon">
                <a href={`tel:${lead.phone}`} className="text-accent hover:underline tabular-nums">
                  {lead.phone}
                </a>
              </Detail>
            )}
            {lead.email && (
              <Detail label="Email">
                <a href={`mailto:${lead.email}`} className="text-accent hover:underline break-all">
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
            <p className="text-muted-foreground leading-relaxed border-l-2 border-border pl-3 whitespace-pre-wrap">
              {lead.firstMessage}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-xs">
            <label className="flex items-center gap-2">
              <span className="text-muted-foreground uppercase tracking-wide text-[10px]">
                Responsabil
              </span>
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
            </label>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground uppercase tracking-wide text-[10px]">
                Recontactare
              </span>
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
                  className="px-2 py-1 border border-border text-muted-foreground hover:text-foreground"
                >
                  +{d}z
                </button>
              ))}
              {lead.followUpAt && (
                <button
                  onClick={() => onPatch({ followUpAt: null })}
                  className="px-2 py-1 text-muted-foreground hover:text-foreground"
                >
                  elimină
                </button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex gap-2">
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
                placeholder="Notiță rapidă — ce ați vorbit, ce urmează (Enter salvează)"
                className="flex-1 border border-border bg-background px-3 py-2 text-xs focus:border-foreground focus:outline-none"
              />
              <button
                onClick={addNote}
                disabled={busy || !noteText.trim()}
                className="bg-foreground text-white text-xs font-semibold px-4 disabled:opacity-50"
              >
                Adaugă
              </button>
            </div>

            {lead.note && (
              <p className="text-xs bg-muted px-3 py-2 whitespace-pre-wrap flex items-start gap-2">
                <span className="flex-1">{lead.note}</span>
                <button
                  onClick={() => onPatch({ note: "" })}
                  aria-label="Șterge notița veche"
                  className="text-muted-foreground hover:text-red-600"
                >
                  ×
                </button>
              </p>
            )}

            {notes === null ? (
              <p className="text-[11px] text-muted-foreground">Se încarcă notițele…</p>
            ) : (
              notes.map((n) => (
                <p key={n.id} className="text-xs bg-muted px-3 py-2 flex items-start gap-2">
                  <span className="flex-1 whitespace-pre-wrap">{n.content}</span>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {new Date(n.createdAt).toLocaleDateString("ro-RO", {
                      day: "numeric",
                      month: "short",
                    })}
                    {n.authorName ? ` · ${n.authorName}` : ""}
                  </span>
                  <button
                    onClick={() => deleteNote(n.id)}
                    aria-label="Șterge notița"
                    className="text-muted-foreground hover:text-red-600"
                  >
                    ×
                  </button>
                </p>
              ))
            )}
          </div>

          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            {lead.phone && (
              <a
                href={`tel:${lead.phone}`}
                className="px-3 py-1.5 bg-foreground text-white hover:bg-foreground/90"
              >
                📞 Sună
              </a>
            )}
            {wa && (
              <a
                href={wa}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 border border-green-300 text-green-700 hover:bg-green-50"
              >
                🟢 WhatsApp
              </a>
            )}
            {lead.conversation && (
              <Link
                href={conversationHref(lead.conversation)}
                className="px-3 py-1.5 border border-border hover:border-foreground"
              >
                💬 Vezi conversația
              </Link>
            )}
            {lead.patientId ? (
              <Link
                href="/admin/pacienti"
                className="px-3 py-1.5 border border-emerald-300 text-emerald-700 hover:bg-emerald-50"
              >
                ✅ Este pacient
              </Link>
            ) : (
              <button
                onClick={convert}
                disabled={busy}
                className="px-3 py-1.5 border border-green-300 text-green-700 hover:bg-green-50 disabled:opacity-50"
              >
                → Creează pacient
              </button>
            )}
            <button
              onClick={onEdit}
              className="px-3 py-1.5 border border-border hover:border-foreground"
            >
              ✏️ Editează
            </button>
            <Link
              href={`/admin/leads/${lead.id}`}
              className="px-3 py-1.5 border border-border hover:border-foreground"
            >
              Fișa completă ↗
            </Link>
            <button
              onClick={onDelete}
              className="px-3 py-1.5 border border-red-200 text-red-600 hover:bg-red-50 ml-auto"
            >
              Șterge
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-foreground font-medium break-words">{children}</p>
    </div>
  );
}
