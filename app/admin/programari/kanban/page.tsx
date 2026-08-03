"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { secureFetch } from "@/lib/csrf-client";
import Link from "next/link";

type Status = "pending" | "confirmed" | "completed" | "cancelled" | "noshow" | "test";

interface Appointment {
  id: string;
  dateTime: string;
  duration: number;
  status: Status;
  notes?: string | null;
  patient: { id: string; name: string; phone: string };
  service: { id: string; title: string; duration: number };
}

type RangePreset = "today" | "week" | "month" | "custom";

const STATUS_META: Record<
  Status,
  { label: string; color: string; dot: string; header: string }
> = {
  pending: {
    label: "În așteptare",
    color: "border-t-amber-400 bg-amber-50",
    dot: "bg-amber-400",
    header: "bg-amber-400",
  },
  confirmed: {
    label: "Confirmate",
    color: "border-t-green-400 bg-green-50",
    dot: "bg-green-400",
    header: "bg-green-400",
  },
  completed: {
    label: "Finalizate",
    color: "border-t-blue-400 bg-blue-50",
    dot: "bg-blue-400",
    header: "bg-blue-400",
  },
  cancelled: {
    label: "Anulate",
    color: "border-t-red-400 bg-red-50",
    dot: "bg-red-400",
    header: "bg-red-400",
  },
  noshow: {
    label: "Neprezentați",
    color: "border-t-gray-400 bg-gray-50",
    dot: "bg-gray-400",
    header: "bg-gray-400",
  },
  test: {
    label: "Test",
    color: "border-t-purple-400 bg-purple-50",
    dot: "bg-purple-400",
    header: "bg-purple-400",
  },
};

const COLUMNS: Status[] = [
  "pending",
  "confirmed",
  "completed",
  "cancelled",
  "noshow",
  "test",
];

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}
function startOfWeek(d: Date) {
  const x = startOfDay(d);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}
function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("ro-RO", {
    day: "numeric",
    month: "short",
  });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("ro-RO", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
function fmtDateInput(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function KanbanPage() {
  const [appts, setAppts] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [preset, setPreset] = useState<RangePreset>("today");
  const [customFrom, setCustomFrom] = useState(fmtDateInput(new Date()));
  const [customTo, setCustomTo] = useState(fmtDateInput(new Date()));
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<Status | null>(null);
  // Use a ref so handleDrop always reads the latest dragging value (no stale closures)
  const draggingRef = useRef<string | null>(null);

  // Reset any active drag when filter/search changes
  useEffect(() => {
    setDragging(null);
    setDragOver(null);
    draggingRef.current = null;
  }, [preset, customFrom, customTo, search]);

  const range = useMemo(() => {
    const now = new Date();
    if (preset === "today") return { from: startOfDay(now), to: endOfDay(now) };
    if (preset === "week")
      return {
        from: startOfWeek(now),
        to: endOfDay(new Date(startOfWeek(now).getTime() + 6 * 86400000)),
      };
    if (preset === "month")
      return { from: startOfMonth(now), to: endOfMonth(now) };
    // custom
    return {
      from: startOfDay(new Date(customFrom)),
      to: endOfDay(new Date(customTo)),
    };
  }, [preset, customFrom, customTo]);

  const fetchAppts = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      qs.set("from", range.from.toISOString());
      qs.set("to", range.to.toISOString());
      if (search) qs.set("q", search);
      const res = await secureFetch(`/api/admin/appointments?${qs}`);
      const data = await res.json();
      setAppts(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [range, search]);

  useEffect(() => {
    fetchAppts();
  }, [fetchAppts]);

  const byStatus = useMemo(() => {
    const map: Record<Status, Appointment[]> = {
      pending: [],
      confirmed: [],
      completed: [],
      cancelled: [],
      noshow: [],
    };
    for (const a of appts) {
      map[a.status]?.push(a);
    }
    // sort each column by dateTime asc
    for (const col of COLUMNS) {
      map[col].sort(
        (a, b) =>
          new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime(),
      );
    }
    return map;
  }, [appts]);

  const apptStatusRef = useRef<Map<string, Status>>(new Map());
  useEffect(() => {
    apptStatusRef.current = new Map(appts.map((a) => [a.id, a.status]));
  }, [appts]);

  const changeStatus = useCallback(async (id: string, newStatus: Status) => {
    // Guard: skip if status hasn't actually changed (prevents spurious API calls)
    const currentStatus = apptStatusRef.current.get(id);
    if (!currentStatus || currentStatus === newStatus) return;
    // Optimistic UI update
    setAppts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: newStatus } : a)),
    );
    // Persist to server
    secureFetch(`/api/admin/appointments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    }).catch((e) => console.error("changeStatus:", e));
  }, []);

  const handleDrop = useCallback(
    (targetStatus: Status) => {
      // Use ref to get the latest dragging id (avoids stale closure)
      const id = draggingRef.current;
      if (!id) return;
      setDragging(null);
      setDragOver(null);
      draggingRef.current = null;
      changeStatus(id, targetStatus);
    },
    [changeStatus],
  );

  const totalByStatus = (s: Status) => byStatus[s].length;

  const presets: { key: RangePreset; label: string }[] = [
    { key: "today", label: "Azi" },
    { key: "week", label: "Săptămâna" },
    { key: "month", label: "Luna" },
    { key: "custom", label: "Perioadă" },
  ];

  // Mobile tab state — which status column is visible
  const [mobileTab, setMobileTab] = useState<Status>("pending");

  return (
    <div className="min-h-screen bg-muted flex flex-col">
      {/* Header */}
      <div className="bg-background border-b border-border px-4 sm:px-6 py-3 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/programari"
              className="text-muted-foreground hover:text-foreground transition-colors text-sm"
            >
              ← Calendar
            </Link>
            <span className="text-border hidden sm:inline">|</span>
            <h1 className="font-serif text-lg font-medium text-foreground hidden sm:block">
              Kanban Programări
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Search */}
            <input
              type="search"
              placeholder="Caută pacient..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="px-3 py-1.5 border border-border bg-background text-sm rounded w-36 sm:w-44"
            />
            <Link
              href="/admin/programari?nou=1"
              className="px-3 py-1.5 bg-foreground text-white text-sm rounded hover:bg-foreground/90 transition-colors whitespace-nowrap"
            >
              + Programare
            </Link>
          </div>
        </div>

        {/* Preset buttons + custom range — second row */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex border border-border bg-muted rounded-lg overflow-hidden">
            {presets.map((p) => (
              <button
                key={p.key}
                onClick={() => setPreset(p.key)}
                className={`px-2.5 py-1.5 text-xs sm:text-sm transition-colors ${
                  preset === p.key
                    ? "bg-foreground text-white"
                    : "hover:bg-background"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {preset === "custom" && (
            <div className="flex items-center gap-1 flex-wrap">
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="px-2 py-1.5 border border-border bg-background text-xs sm:text-sm rounded"
              />
              <span className="text-muted-foreground text-sm">→</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="px-2 py-1.5 border border-border bg-background text-xs sm:text-sm rounded"
              />
            </div>
          )}
        </div>
      </div>

      {/* Stats bar */}
      <div className="bg-background border-b border-border px-4 sm:px-6 py-2 flex gap-4 overflow-x-auto">
        {COLUMNS.map((s) => (
          <div key={s} className="flex items-center gap-1.5 text-sm shrink-0">
            <span className={`w-2 h-2 rounded-full ${STATUS_META[s].dot}`} />
            <span className="text-muted-foreground hidden sm:inline">
              {STATUS_META[s].label}
            </span>
            <span className="font-semibold text-foreground">
              {totalByStatus(s)}
            </span>
          </div>
        ))}
        <div className="ml-auto flex items-center gap-1 text-sm text-muted-foreground shrink-0">
          Total:
          <span className="font-semibold text-foreground">{appts.length}</span>
        </div>
      </div>

      {/* Mobile status tabs */}
      <div className="md:hidden flex border-b border-border bg-background overflow-x-auto shrink-0">
        {COLUMNS.map((s) => {
          const meta = STATUS_META[s];
          const active = mobileTab === s;
          return (
            <button
              key={s}
              onClick={() => setMobileTab(s)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors shrink-0 ${
                active
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
              {meta.label}
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${active ? "bg-foreground text-white" : "bg-muted text-muted-foreground"}`}
              >
                {totalByStatus(s)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Kanban board */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          Se încarcă...
        </div>
      ) : (
        <>
          {/* ── MOBILE: single column view ── */}
          <div className="md:hidden flex-1 overflow-y-auto p-3">
            {byStatus[mobileTab].length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-12">
                Nicio programare în această categorie.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {byStatus[mobileTab].map((a) => (
                  <KanbanCard
                    key={a.id}
                    appt={a}
                    isDragging={false}
                    onDragStart={() => {}}
                    onDragEnd={() => {}}
                    onStatusChange={(s) => {
                      changeStatus(a.id, s);
                      setMobileTab(s);
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* ── DESKTOP: full kanban columns ── */}
          <div className="hidden md:flex flex-1 gap-3 p-4 overflow-x-auto items-start">
            {COLUMNS.map((col) => {
              const meta = STATUS_META[col];
              const cards = byStatus[col];
              const isOver = dragOver === col;

              return (
                <div
                  key={col}
                  className={`flex flex-col rounded-xl border-2 border-t-4 shrink-0 w-72 transition-all duration-150 ${meta.color} ${
                    isOver ? "ring-2 ring-foreground/30 scale-[1.01]" : ""
                  }`}
                  style={{ borderTopColor: undefined }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(col);
                  }}
                  onDragLeave={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                      setDragOver(null);
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleDrop(col);
                  }}
                >
                  {/* Column header */}
                  <div
                    className={`px-4 py-3 rounded-t-xl flex items-center justify-between ${meta.header}`}
                  >
                    <span className="text-white font-semibold text-sm">
                      {meta.label}
                    </span>
                    <span className="bg-white/30 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                      {cards.length}
                    </span>
                  </div>

                  {/* Cards */}
                  <div className="flex flex-col gap-2 p-2 min-h-24 overflow-y-auto max-h-[calc(100vh-220px)]">
                    {cards.length === 0 && (
                      <p className="text-xs text-center text-muted-foreground py-6">
                        Nicio programare
                      </p>
                    )}
                    {cards.map((a) => (
                      <KanbanCard
                        key={a.id}
                        appt={a}
                        isDragging={dragging === a.id}
                        onDragStart={() => {
                          draggingRef.current = a.id;
                          setDragging(a.id);
                        }}
                        onDragEnd={() => {
                          draggingRef.current = null;
                          setDragging(null);
                          setDragOver(null);
                        }}
                        onStatusChange={(s) => changeStatus(a.id, s)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function KanbanCard({
  appt,
  isDragging,
  onDragStart,
  onDragEnd,
  onStatusChange,
}: {
  appt: Appointment;
  isDragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onStatusChange: (s: Status) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  const isToday =
    new Date(appt.dateTime).toDateString() === new Date().toDateString();

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`bg-white rounded-lg border border-border shadow-sm p-3 cursor-grab active:cursor-grabbing select-none transition-all duration-150 ${
        isDragging ? "opacity-40 scale-95" : "hover:shadow-md"
      }`}
    >
      {/* Time + date */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <svg
            className="w-3.5 h-3.5 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="text-xs font-semibold text-foreground">
            {fmtTime(appt.dateTime)}
          </span>
          <span className="text-xs text-muted-foreground">
            {isToday ? "Azi" : fmtDate(appt.dateTime)}
          </span>
        </div>
        {/* Actions menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="p-0.5 rounded hover:bg-muted transition-colors"
          >
            <svg
              className="w-4 h-4 text-muted-foreground"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-6 z-50 bg-white border border-border rounded-lg shadow-lg py-1 w-40">
              {(Object.keys(STATUS_META) as Status[])
                .filter((s) => s !== appt.status)
                .map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      onStatusChange(s);
                      setMenuOpen(false);
                    }}
                    className="flex items-center gap-2 w-full text-left px-3 py-1.5 text-xs hover:bg-muted transition-colors"
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${STATUS_META[s].dot}`}
                    />
                    {STATUS_META[s].label}
                  </button>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Patient */}
      <div className="flex items-center gap-2 mb-1.5">
        <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center text-white text-[10px] font-bold shrink-0">
          {appt.patient.name
            .split(" ")
            .map((w) => w[0])
            .join("")
            .slice(0, 2)
            .toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground truncate leading-tight">
            {appt.patient.name}
          </p>
          <a
            href={`tel:${appt.patient.phone}`}
            className="text-[11px] text-muted-foreground hover:text-accent transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            {appt.patient.phone}
          </a>
        </div>
      </div>

      {/* Service */}
      <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-border">
        <svg
          className="w-3.5 h-3.5 text-accent shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.8}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z"
          />
        </svg>
        <span className="text-xs text-muted-foreground truncate">
          {appt.service.title}
        </span>
        <span className="ml-auto text-[11px] text-muted-foreground shrink-0">
          {appt.duration} min
        </span>
      </div>

      {/* Notes */}
      {appt.notes && (
        <p className="mt-1.5 text-[11px] text-muted-foreground italic truncate">
          {appt.notes}
        </p>
      )}
    </div>
  );
}
