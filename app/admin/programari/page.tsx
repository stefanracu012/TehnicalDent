"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { secureFetch } from "@/lib/csrf-client";

type Status = "pending" | "confirmed" | "cancelled" | "completed" | "noshow" | "test";

interface Service {
  id: string;
  title: string;
  duration: number;
}
interface Patient {
  id: string;
  name: string;
  phone: string;
}
interface Appointment {
  id: string;
  dateTime: string;
  duration: number;
  status: Status;
  notes?: string | null;
  teamMemberId?: string | null;
  patient: { id: string; name: string; phone: string };
  service: { id: string; title: string; duration: number };
  teamMember?: { id: string; name: string; role: string } | null;
}

const STATUS_LABELS: Record<Status, string> = {
  pending: "În așteptare",
  confirmed: "Confirmată",
  cancelled: "Anulată",
  completed: "Finalizată",
  noshow: "Neprezentat",
  test: "Test",
};

const STATUS_BG: Record<Status, string> = {
  pending: "bg-amber-100 border-amber-300 text-amber-900",
  confirmed: "bg-green-100 border-green-300 text-green-900",
  cancelled: "bg-red-100 border-red-300 text-red-900 line-through opacity-70",
  completed: "bg-blue-100 border-blue-300 text-blue-900",
  noshow: "bg-gray-200 border-gray-400 text-gray-700",
  test: "bg-purple-100 border-purple-300 text-purple-900 opacity-70",
};

const STATUS_DOT: Record<Status, string> = {
  pending: "bg-amber-500",
  confirmed: "bg-green-500",
  cancelled: "bg-red-500",
  completed: "bg-blue-500",
  noshow: "bg-gray-500",
  test: "bg-purple-500",
};

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function startOfWeek(d: Date) {
  const x = startOfDay(d);
  const day = (x.getDay() + 6) % 7; // monday-first
  x.setDate(x.getDate() - day);
  return x;
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function fmtDay(d: Date) {
  return d.toLocaleDateString("ro-RO", {
    weekday: "short",
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
function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const HOURS = Array.from({ length: 13 }, (_, i) => 8 + i); // 08:00..20:00
const HOUR_PX = 60;

export default function AdminAppointmentsPage() {
  const [view, setView] = useState<"day" | "week" | "list">("week");
  const [anchor, setAnchor] = useState<Date>(startOfDay(new Date()));
  const [appts, setAppts] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  // filters
  const [filterStatus, setFilterStatus] = useState<"" | Status>("");
  const [filterServiceId, setFilterServiceId] = useState("");
  const [search, setSearch] = useState("");
  const [filterMonth, setFilterMonth] = useState<string>(""); // "YYYY-MM"

  // modal
  const [editing, setEditing] = useState<Appointment | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Deschide formularul automat dacă URL conține ?nou=1
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("nou") === "1") {
      setShowForm(true);
      // Curăță param din URL fără reload
      const url = new URL(window.location.href);
      url.searchParams.delete("nou");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  const range = useMemo(() => {
    if (view === "day") {
      return { from: startOfDay(anchor), to: addDays(startOfDay(anchor), 1) };
    }
    if (view === "week") {
      const f = startOfWeek(anchor);
      return { from: f, to: addDays(f, 7) };
    }
    // list view: month filter or ±60 days
    if (filterMonth) {
      const [y, m] = filterMonth.split("-").map(Number);
      const from = new Date(y, m - 1, 1);
      const to = new Date(y, m, 1);
      return { from, to };
    }
    return {
      from: addDays(startOfDay(anchor), -60),
      to: addDays(startOfDay(anchor), 60),
    };
  }, [view, anchor, filterMonth]);

  const fetchAppts = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      qs.set("from", range.from.toISOString());
      qs.set("to", range.to.toISOString());
      if (filterStatus) qs.set("status", filterStatus);
      if (filterServiceId) qs.set("serviceId", filterServiceId);
      if (search) qs.set("q", search);
      const res = await secureFetch(`/api/admin/appointments?${qs}`);
      const data = await res.json();
      setAppts(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [range, filterStatus, filterServiceId, search]);

  useEffect(() => {
    fetchAppts();
  }, [fetchAppts]);

  useEffect(() => {
    secureFetch("/api/admin/services")
      .then((r) => r.json())
      .then((data) =>
        setServices(
          (Array.isArray(data) ? data : []).map(
            (s: { id: string; title: string; duration?: number }) => ({
              id: s.id,
              title: s.title,
              duration: s.duration || 30,
            }),
          ),
        ),
      )
      .catch(() => {});
  }, []);

  // Closes the edit modal if it's showing the appointment we just acted on
  // (its `editing.status` snapshot would otherwise go stale immediately).
  const closeIfEditing = (id: string) => {
    setEditing((prev) => (prev?.id === id ? null : prev));
    if (editing?.id === id) setShowForm(false);
  };

  const onConfirm = async (id: string) => {
    setAppts((prev) => prev.map((a) => (a.id === id ? { ...a, status: "confirmed" } : a)));
    closeIfEditing(id);
    try {
      await secureFetch(`/api/admin/appointments/${id}/confirm`, { method: "POST" });
    } catch (e) {
      console.error(e);
    }
    fetchAppts();
  };
  const onCancel = async (id: string) => {
    if (!confirm("Anulați programarea?")) return;
    setAppts((prev) => prev.map((a) => (a.id === id ? { ...a, status: "cancelled" } : a)));
    closeIfEditing(id);
    try {
      await secureFetch(`/api/admin/appointments/${id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Anulat din admin" }),
      });
    } catch (e) {
      console.error(e);
    }
    fetchAppts();
  };
  const onDelete = async (id: string) => {
    if (!confirm("Ștergeți definitiv programarea?")) return;
    setAppts((prev) => prev.filter((a) => a.id !== id));
    closeIfEditing(id);
    try {
      await secureFetch(`/api/admin/appointments/${id}`, { method: "DELETE" });
    } catch (e) {
      console.error(e);
    }
    fetchAppts();
  };
  const onChangeStatus = async (id: string, status: Status) => {
    setAppts((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
    closeIfEditing(id);
    try {
      await secureFetch(`/api/admin/appointments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
    } catch (e) {
      console.error(e);
    }
    fetchAppts();
  };

  const openNew = () => {
    setEditing(null);
    setShowForm(true);
  };
  const openEdit = (a: Appointment) => {
    setEditing(a);
    setShowForm(true);
  };
  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
  };

  // ---- Calendar layout ----
  const days = useMemo(() => {
    if (view === "day") return [startOfDay(anchor)];
    if (view === "week") {
      const w = startOfWeek(anchor);
      return Array.from({ length: 7 }, (_, i) => addDays(w, i));
    }
    return [];
  }, [view, anchor]);

  const apptsByDay = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const a of appts) {
      const d = startOfDay(new Date(a.dateTime));
      const key = d.toISOString();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    }
    return map;
  }, [appts]);

  return (
    <div className="h-full flex flex-col overflow-hidden bg-muted">
      <div className="px-4 sm:px-6 lg:px-8 pt-4 pb-2 shrink-0">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-3">
          <div>
            <h1 className="font-serif text-xl sm:text-2xl font-medium text-foreground">
              Programări
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex border border-border bg-background">
              {(["day", "week", "list"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`px-3 py-2 text-sm ${view === v ? "bg-foreground text-white" : "hover:bg-muted"}`}
                >
                  {v === "day" ? "Zi" : v === "week" ? "Săptămână" : "Listă"}
                </button>
              ))}
              <Link
                href="/admin/programari/kanban"
                className="px-3 py-2 text-sm hover:bg-muted flex items-center gap-1 border-l border-border"
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
                  />
                </svg>
                Kanban
              </Link>
            </div>
            <button
              onClick={() =>
                setAnchor(addDays(anchor, view === "week" ? -7 : -1))
              }
              className="px-3 py-2 text-sm border border-border bg-background hover:bg-muted"
            >
              ←
            </button>
            <button
              onClick={() => setAnchor(startOfDay(new Date()))}
              className="px-3 py-2 text-sm border border-border bg-background hover:bg-muted"
            >
              Astăzi
            </button>
            <button
              onClick={() =>
                setAnchor(addDays(anchor, view === "week" ? 7 : 1))
              }
              className="px-3 py-2 text-sm border border-border bg-background hover:bg-muted"
            >
              →
            </button>
            <button
              onClick={openNew}
              className="bg-foreground text-white px-4 py-2 text-sm font-medium hover:bg-foreground/90"
            >
              + Programare
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as "" | Status)}
            className="px-3 py-2 border border-border bg-background text-sm"
          >
            <option value="">Toate statusurile</option>
            {(Object.keys(STATUS_LABELS) as Status[]).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <select
            value={filterServiceId}
            onChange={(e) => setFilterServiceId(e.target.value)}
            className="px-3 py-2 border border-border bg-background text-sm"
          >
            <option value="">Toate serviciile</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
          {view === "list" && (
            <input
              type="month"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="px-3 py-2 border border-border bg-background text-sm"
            />
          )}
          <input
            type="search"
            placeholder="Caută pacient/serviciu..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-2 border border-border bg-background text-sm flex-1 min-w-[200px]"
          />
        </div>

        {loading && <p className="text-muted-foreground py-2">Se încarcă...</p>}
      </div>

      {/* Calendar grid (day + week) */}
      {!loading && view !== "list" && (
        <div className="flex-1 overflow-auto bg-background border-t border-border mx-4 sm:mx-6 lg:mx-8 mb-4 rounded-b-lg border-x border-b">
          <div
            className="grid"
            style={{
              gridTemplateColumns: `60px repeat(${days.length}, minmax(140px, 1fr))`,
            }}
          >
            <div className="border-b border-border bg-muted/40" />
            {days.map((d) => (
              <div
                key={d.toISOString()}
                className="border-b border-l border-border p-2 text-xs font-semibold uppercase tracking-wide text-center bg-muted/40"
              >
                {fmtDay(d)}
              </div>
            ))}

            {/* Hour rows */}
            {HOURS.map((h) => (
              <div key={`row-${h}`} className="contents">
                <div
                  className="border-t border-border text-[11px] text-muted-foreground text-right pr-2"
                  style={{ height: HOUR_PX }}
                >
                  {String(h).padStart(2, "0")}:00
                </div>
                {days.map((d) => (
                  <div
                    key={`${d.toISOString()}-${h}`}
                    className="border-t border-l border-border relative"
                    style={{ height: HOUR_PX }}
                  />
                ))}
              </div>
            ))}
          </div>

          {/* Overlay day columns absolutely-positioned blocks */}
          <div
            className="grid relative"
            style={{
              gridTemplateColumns: `60px repeat(${days.length}, minmax(140px, 1fr))`,
              marginTop: -HOUR_PX * HOURS.length - 1,
              pointerEvents: "none",
            }}
          >
            <div />
            {days.map((d) => {
              const list = apptsByDay.get(d.toISOString()) || [];
              return (
                <div
                  key={`overlay-${d.toISOString()}`}
                  className="relative"
                  style={{ height: HOUR_PX * HOURS.length }}
                >
                  {list.map((a) => {
                    const start = new Date(a.dateTime);
                    const minutesFromTop =
                      (start.getHours() - HOURS[0]) * 60 + start.getMinutes();
                    if (
                      minutesFromTop < 0 ||
                      minutesFromTop > HOURS.length * 60
                    )
                      return null;
                    const top = (minutesFromTop / 60) * HOUR_PX;
                    const height = Math.max(
                      28,
                      (a.duration / 60) * HOUR_PX - 2,
                    );
                    return (
                      <button
                        key={a.id}
                        onClick={() => openEdit(a)}
                        style={{
                          top,
                          height,
                          left: 4,
                          right: 4,
                          position: "absolute",
                          pointerEvents: "auto",
                        }}
                        className={`text-left text-[11px] px-1.5 py-1 border rounded shadow-sm overflow-hidden ${STATUS_BG[a.status]}`}
                      >
                        <div className="font-semibold truncate">
                          {fmtTime(a.dateTime)} · {a.patient.name}
                        </div>
                        <div className="truncate">{a.service.title}</div>
                        <div className="truncate opacity-70">
                          {a.teamMember ? a.teamMember.name : "fără medic"}
                        </div>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* List view */}
      {!loading && view === "list" && (
        <div className="flex-1 overflow-auto bg-background border-t border-border mx-4 sm:mx-6 lg:mx-8 mb-4 rounded-b-lg border-x border-b">
          {appts.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground text-center">
              Nicio programare.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Data / Ora</th>
                  <th className="px-4 py-3 font-medium">Pacient</th>
                  <th className="px-4 py-3 font-medium">Serviciu</th>
                  <th className="px-4 py-3 font-medium">Medic</th>
                  <th className="px-4 py-3 font-medium">Durată</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Acțiuni</th>
                </tr>
              </thead>
              <tbody>
                {appts.map((a) => (
                  <tr
                    key={a.id}
                    className="border-t border-border hover:bg-muted/30"
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      {new Date(a.dateTime).toLocaleString("ro-RO", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{a.patient.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {a.patient.phone}
                      </div>
                    </td>
                    <td className="px-4 py-3">{a.service.title}</td>
                    <td className="px-4 py-3">
                      {a.teamMember ? (
                        <>
                          <div>{a.teamMember.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {a.teamMember.role}
                          </div>
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          neatribuit
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {a.duration} min
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 text-xs">
                        <span
                          className={`w-2 h-2 rounded-full ${STATUS_DOT[a.status]}`}
                        />
                        {STATUS_LABELS[a.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap space-x-1">
                      {a.status !== "confirmed" && a.status !== "cancelled" && (
                        <button
                          onClick={() => onConfirm(a.id)}
                          className="text-xs px-2 py-1 border border-green-200 text-green-700 hover:bg-green-50"
                        >
                          Confirmă
                        </button>
                      )}
                      {a.status !== "cancelled" && (
                        <button
                          onClick={() => onCancel(a.id)}
                          className="text-xs px-2 py-1 border border-red-200 text-red-700 hover:bg-red-50"
                        >
                          Anulează
                        </button>
                      )}
                      <button
                        onClick={() => openEdit(a)}
                        className="text-xs px-2 py-1 border border-border hover:bg-muted"
                      >
                        Editează
                      </button>
                      <button
                        onClick={() => onDelete(a.id)}
                        className="text-xs px-2 py-1 border border-border hover:bg-muted"
                      >
                        🗑
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {showForm && (
        <AppointmentForm
          editing={editing}
          services={services}
          onClose={closeForm}
          onSaved={() => {
            closeForm();
            fetchAppts();
          }}
          onConfirm={onConfirm}
          onCancel={onCancel}
          onChangeStatus={onChangeStatus}
        />
      )}
    </div>
  );
}

// =============================================
// Form modal (create / edit)
// =============================================
function AppointmentForm({
  editing,
  services,
  onClose,
  onSaved,
  onConfirm,
  onCancel,
  onChangeStatus,
}: {
  editing: Appointment | null;
  services: Service[];
  onClose: () => void;
  onSaved: () => void;
  onConfirm: (id: string) => void;
  onCancel: (id: string) => void;
  onChangeStatus: (id: string, status: Status) => void;
}) {
  const initialDate = editing
    ? toLocalInput(new Date(editing.dateTime))
    : toLocalInput(new Date(Date.now() + 60 * 60_000));

  const [serviceId, setServiceId] = useState(
    editing?.service.id || services[0]?.id || "",
  );
  const [duration, setDuration] = useState(
    editing?.duration || services[0]?.duration || 30,
  );
  const [dateTime, setDateTime] = useState(initialDate);
  const [notes, setNotes] = useState(editing?.notes || "");

  const [doctors, setDoctors] = useState<{ id: string; name: string; role: string }[]>([]);
  const [freeSlots, setFreeSlots] = useState<Record<string, number[]>>({});
  const [teamMemberId, setTeamMemberId] = useState(editing?.teamMemberId || "");
  const [slotsLoading, setSlotsLoading] = useState(false);

  const [patientQuery, setPatientQuery] = useState(editing?.patient.name || "");
  const [patientResults, setPatientResults] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(
    editing
      ? {
          id: editing.patient.id,
          name: editing.patient.name,
          phone: editing.patient.phone,
        }
      : null,
  );
  const [creatingNew, setCreatingNew] = useState(false);
  const [newPatient, setNewPatient] = useState({
    name: "",
    phone: "",
    email: "",
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-update duration when service changes
  useEffect(() => {
    if (!editing) {
      const svc = services.find((s) => s.id === serviceId);
      if (svc) setDuration(svc.duration);
    }
  }, [serviceId, services, editing]);

  // Doctors + their free hours for the chosen day
  useEffect(() => {
    const day = dateTime.slice(0, 10);
    if (!day) return;
    setSlotsLoading(true);
    const qs = new URLSearchParams({ date: day });
    if (editing) qs.set("excludeAppointmentId", editing.id);
    secureFetch(`/api/admin/appointments/free-slots?${qs}`)
      .then((r) => r.json())
      .then((d) => {
        setDoctors(Array.isArray(d.doctors) ? d.doctors : []);
        setFreeSlots(d.slots || {});
      })
      .catch(() => {})
      .finally(() => setSlotsLoading(false));
  }, [dateTime, editing]);

  // Patient search
  useEffect(() => {
    if (selectedPatient && selectedPatient.name === patientQuery) return;
    if (!patientQuery.trim()) {
      setPatientResults([]);
      return;
    }
    const t = setTimeout(() => {
      secureFetch(`/api/admin/patients?q=${encodeURIComponent(patientQuery)}`)
        .then((r) => r.json())
        .then((d) => setPatientResults(Array.isArray(d) ? d.slice(0, 8) : []))
        .catch(() => {});
    }, 250);
    return () => clearTimeout(t);
  }, [patientQuery, selectedPatient]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      let patientId = selectedPatient?.id;

      if (!patientId && creatingNew) {
        const r = await secureFetch("/api/admin/patients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newPatient),
        });
        const d = await r.json();
        if (!r.ok) {
          if (r.status === 409 && d.id) {
            patientId = d.id;
          } else {
            throw new Error(d.error || "Eroare creare pacient");
          }
        } else {
          patientId = d.id;
        }
      }

      if (!patientId) throw new Error("Selectați sau creați un pacient.");
      if (!serviceId) throw new Error("Selectați un serviciu.");

      const url = editing
        ? `/api/admin/appointments/${editing.id}`
        : "/api/admin/appointments";
      const method = editing ? "PATCH" : "POST";

      const body = {
        patientId,
        serviceId,
        duration,
        dateTime: new Date(dateTime).toISOString(),
        teamMemberId: teamMemberId || null,
        notes,
      };
      const r = await secureFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Eroare salvare");
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-4">
      <div className="bg-background max-w-2xl w-full p-6 max-h-[92vh] overflow-y-auto">
        <h2 className="font-serif text-xl font-medium mb-4">
          {editing ? "Editează programare" : "Programare nouă"}
        </h2>

        <form onSubmit={submit} className="space-y-4">
          {/* Patient */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
              Pacient *
            </label>
            {selectedPatient && !creatingNew ? (
              <div className="flex items-center justify-between px-3 py-2 border border-border bg-muted/30">
                <div>
                  <p className="text-sm font-medium">{selectedPatient.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {selectedPatient.phone}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPatient(null);
                    setPatientQuery("");
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Schimbă
                </button>
              </div>
            ) : creatingNew ? (
              <div className="border border-accent/30 p-3 space-y-2 bg-accent/5 rounded">
                <p className="text-xs font-semibold text-accent uppercase tracking-wide mb-2">
                  Pacient nou
                </p>
                <input
                  required
                  placeholder="Nume complet *"
                  value={newPatient.name}
                  onChange={(e) =>
                    setNewPatient({ ...newPatient, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-border bg-background text-sm rounded"
                />
                <input
                  required
                  placeholder="Telefon * (ex: +40712345678)"
                  value={newPatient.phone}
                  onChange={(e) =>
                    setNewPatient({ ...newPatient, phone: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-border bg-background text-sm rounded"
                />
                <input
                  type="email"
                  placeholder="Email (opțional)"
                  value={newPatient.email}
                  onChange={(e) =>
                    setNewPatient({ ...newPatient, email: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-border bg-background text-sm rounded"
                />
                <button
                  type="button"
                  onClick={() => setCreatingNew(false)}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  ← Înapoi la căutare
                </button>
              </div>
            ) : (
              <>
                <input
                  type="text"
                  placeholder="Caută după nume sau telefon..."
                  value={patientQuery}
                  onChange={(e) => setPatientQuery(e.target.value)}
                  className="w-full px-3 py-2 border border-border bg-background text-sm"
                />
                {patientResults.length > 0 && (
                  <ul className="mt-1 border border-border max-h-40 overflow-y-auto">
                    {patientResults.map((p) => (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPatient(p);
                            setPatientQuery(p.name);
                            setPatientResults([]);
                          }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-muted"
                        >
                          <span className="font-medium">{p.name}</span>{" "}
                          <span className="text-muted-foreground">
                            · {p.phone}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {patientQuery.trim() && patientResults.length === 0 && (
                  <p className="mt-1 text-xs text-muted-foreground px-1">
                    Niciun pacient găsit.
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => setCreatingNew(true)}
                  className="mt-2 flex items-center gap-1.5 px-3 py-1.5 text-xs border border-accent/40 text-accent hover:bg-accent/10 rounded transition-colors"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 4.5v15m7.5-7.5h-15"
                    />
                  </svg>
                  Pacient nou
                </button>
              </>
            )}
          </div>

          {/* Service */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
              Serviciu *
            </label>
            <select
              required
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
              className="w-full px-3 py-2 border border-border bg-background text-sm"
            >
              <option value="">— alegeți —</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title} ({s.duration} min)
                </option>
              ))}
            </select>
          </div>

          {/* Doctor */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
              Doctor
            </label>
            <select
              value={teamMemberId}
              onChange={(e) => setTeamMemberId(e.target.value)}
              className="w-full px-3 py-2 border border-border bg-background text-sm"
            >
              <option value="">— fără doctor alocat —</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} — {d.role}
                  {freeSlots[d.id]?.length === 0 ? " (indisponibil)" : ""}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-muted-foreground mt-1">
              Alocarea unui doctor rezervă intervalul, astfel încât altcineva
              să nu poată programa în același timp.
            </p>
          </div>

          {/* Day / Duration */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                Ziua *
              </label>
              <input
                type="date"
                required
                value={dateTime.slice(0, 10)}
                onChange={(e) =>
                  setDateTime(`${e.target.value}T${dateTime.slice(11, 16) || "09:00"}`)
                }
                className="w-full px-3 py-2 border border-border bg-background text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                Durată (min)
              </label>
              <input
                type="number"
                min={5}
                step={5}
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value) || 30)}
                className="w-full px-3 py-2 border border-border bg-background text-sm"
              />
            </div>
          </div>

          {/* Hour — whole hours only, and from the doctor's calendar when
              there is one, so reception cannot book an hour the doctor never
              opened. Without a doctor the whole working day is offered. */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
              Ora *
            </label>
            {teamMemberId && slotsLoading ? (
              <p className="text-sm text-muted-foreground">Se încarcă...</p>
            ) : teamMemberId && (freeSlots[teamMemberId]?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">
                Doctorul nu a bifat nicio oră liberă în această zi. Alegeți altă
                zi sau alt doctor, ori completați calendarul.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {(teamMemberId
                  ? freeSlots[teamMemberId]
                  : Array.from({ length: 16 }, (_, i) => i + 8)
                ).map((h) => {
                  const active = Number(dateTime.slice(11, 13)) === h;
                  return (
                    <button
                      key={h}
                      type="button"
                      onClick={() =>
                        setDateTime(
                          `${dateTime.slice(0, 11)}${String(h).padStart(2, "0")}:00`,
                        )
                      }
                      className={`px-3 py-1.5 text-sm border transition-colors ${
                        active
                          ? "bg-foreground text-background border-foreground"
                          : "bg-background border-border hover:border-foreground/50"
                      }`}
                    >
                      {String(h).padStart(2, "0")}:00
                    </button>
                  );
                })}
              </div>
            )}
            <p className="text-[11px] text-muted-foreground mt-1">
              {teamMemberId
                ? "Doar orele bifate de doctor în calendar."
                : "Alegeți un doctor mai sus ca să vedeți doar orele lui libere."}
            </p>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
              Note
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-border bg-background text-sm"
            />
          </div>

          {error && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-2">
              {error}
            </div>
          )}

          {/* Status quick-actions when editing */}
          {editing && (
            <div className="border-t border-border pt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Acțiuni rapide
              </p>
              <div className="flex flex-wrap gap-2">
                {editing.status !== "confirmed" && (
                  <button
                    type="button"
                    onClick={() => onConfirm(editing.id)}
                    className="text-xs px-3 py-1.5 border border-green-200 text-green-700 hover:bg-green-50"
                  >
                    Confirmă
                  </button>
                )}
                {editing.status !== "cancelled" && (
                  <button
                    type="button"
                    onClick={() => onCancel(editing.id)}
                    className="text-xs px-3 py-1.5 border border-red-200 text-red-700 hover:bg-red-50"
                  >
                    Anulează
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onChangeStatus(editing.id, "completed")}
                  className="text-xs px-3 py-1.5 border border-blue-200 text-blue-700 hover:bg-blue-50"
                >
                  Marchează finalizată
                </button>
                <button
                  type="button"
                  onClick={() => onChangeStatus(editing.id, "noshow")}
                  className="text-xs px-3 py-1.5 border border-border hover:bg-muted"
                >
                  Neprezentat
                </button>
                {editing.status !== "test" && (
                  <button
                    type="button"
                    onClick={() => onChangeStatus(editing.id, "test")}
                    className="text-xs px-3 py-1.5 border border-purple-200 text-purple-700 hover:bg-purple-50"
                  >
                    Marchează test
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-2 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm border border-border hover:bg-muted"
            >
              Anulează
            </button>
            <button
              type="submit"
              disabled={saving}
              className="bg-foreground text-white px-4 py-2 text-sm font-medium hover:bg-foreground/90 disabled:opacity-50"
            >
              {saving ? "Se salvează..." : editing ? "Salvează" : "Creează"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
