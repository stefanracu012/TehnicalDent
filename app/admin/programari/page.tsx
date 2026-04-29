"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { secureFetch } from "@/lib/csrf-client";

type Status = "pending" | "confirmed" | "cancelled" | "completed" | "noshow";

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
  patient: { id: string; name: string; phone: string };
  service: { id: string; title: string; duration: number };
}

const STATUS_LABELS: Record<Status, string> = {
  pending: "În așteptare",
  confirmed: "Confirmată",
  cancelled: "Anulată",
  completed: "Finalizată",
  noshow: "Neprezentat",
};

const STATUS_BG: Record<Status, string> = {
  pending: "bg-amber-100 border-amber-300 text-amber-900",
  confirmed: "bg-green-100 border-green-300 text-green-900",
  cancelled: "bg-red-100 border-red-300 text-red-900 line-through opacity-70",
  completed: "bg-blue-100 border-blue-300 text-blue-900",
  noshow: "bg-gray-200 border-gray-400 text-gray-700",
};

const STATUS_DOT: Record<Status, string> = {
  pending: "bg-amber-500",
  confirmed: "bg-green-500",
  cancelled: "bg-red-500",
  completed: "bg-blue-500",
  noshow: "bg-gray-500",
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

  // modal
  const [editing, setEditing] = useState<Appointment | null>(null);
  const [showForm, setShowForm] = useState(false);

  const range = useMemo(() => {
    if (view === "day") {
      return { from: startOfDay(anchor), to: addDays(startOfDay(anchor), 1) };
    }
    if (view === "week") {
      const f = startOfWeek(anchor);
      return { from: f, to: addDays(f, 7) };
    }
    // list view: ±60 days
    return {
      from: addDays(startOfDay(anchor), -60),
      to: addDays(startOfDay(anchor), 60),
    };
  }, [view, anchor]);

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

  const onConfirm = async (id: string) => {
    await secureFetch(`/api/admin/appointments/${id}/confirm`, {
      method: "POST",
    });
    fetchAppts();
  };
  const onCancel = async (id: string) => {
    if (!confirm("Anulați programarea?")) return;
    await secureFetch(`/api/admin/appointments/${id}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "Anulat din admin" }),
    });
    fetchAppts();
  };
  const onDelete = async (id: string) => {
    if (!confirm("Ștergeți definitiv programarea?")) return;
    await secureFetch(`/api/admin/appointments/${id}`, { method: "DELETE" });
    fetchAppts();
  };
  const onChangeStatus = async (id: string, status: Status) => {
    await secureFetch(`/api/admin/appointments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
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
    <div className="min-h-screen bg-muted pt-20">
      <div className="mx-auto max-w-[100rem] px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-6">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-medium text-foreground">
              Programări
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Gestionați calendarul, statusurile și notificările pacienților.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex border border-border bg-white">
              {(["day", "week", "list"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`px-3 py-2 text-sm ${view === v ? "bg-foreground text-white" : "hover:bg-muted"}`}
                >
                  {v === "day" ? "Zi" : v === "week" ? "Săptămână" : "Listă"}
                </button>
              ))}
            </div>
            <button
              onClick={() =>
                setAnchor(addDays(anchor, view === "week" ? -7 : -1))
              }
              className="px-3 py-2 text-sm border border-border bg-white hover:bg-muted"
            >
              ←
            </button>
            <button
              onClick={() => setAnchor(startOfDay(new Date()))}
              className="px-3 py-2 text-sm border border-border bg-white hover:bg-muted"
            >
              Astăzi
            </button>
            <button
              onClick={() =>
                setAnchor(addDays(anchor, view === "week" ? 7 : 1))
              }
              className="px-3 py-2 text-sm border border-border bg-white hover:bg-muted"
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
        <div className="flex flex-wrap gap-2 mb-4">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as "" | Status)}
            className="px-3 py-2 border border-border bg-white text-sm"
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
            className="px-3 py-2 border border-border bg-white text-sm"
          >
            <option value="">Toate serviciile</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
          <input
            type="search"
            placeholder="Caută pacient/serviciu..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-2 border border-border bg-white text-sm flex-1 min-w-[200px]"
          />
        </div>

        {loading && <p className="text-muted-foreground">Se încarcă...</p>}

        {/* Calendar grid (day + week) */}
        {!loading && view !== "list" && (
          <div className="bg-white border border-border overflow-x-auto">
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
          <div className="bg-white border border-border overflow-x-auto">
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
                    <th className="px-4 py-3 font-medium">Durată</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium text-right">
                      Acțiuni
                    </th>
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
                        {a.status !== "confirmed" &&
                          a.status !== "cancelled" && (
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
      </div>

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
      <div className="bg-white max-w-2xl w-full p-6 max-h-[92vh] overflow-y-auto">
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
              <div className="border border-border p-3 space-y-2 bg-muted/20">
                <input
                  required
                  placeholder="Nume *"
                  value={newPatient.name}
                  onChange={(e) =>
                    setNewPatient({ ...newPatient, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-border bg-white text-sm"
                />
                <input
                  required
                  placeholder="Telefon *"
                  value={newPatient.phone}
                  onChange={(e) =>
                    setNewPatient({ ...newPatient, phone: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-border bg-white text-sm"
                />
                <input
                  placeholder="Email"
                  value={newPatient.email}
                  onChange={(e) =>
                    setNewPatient({ ...newPatient, email: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-border bg-white text-sm"
                />
                <button
                  type="button"
                  onClick={() => setCreatingNew(false)}
                  className="text-xs text-muted-foreground hover:text-foreground"
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
                  className="w-full px-3 py-2 border border-border bg-white text-sm"
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
                <button
                  type="button"
                  onClick={() => setCreatingNew(true)}
                  className="mt-2 text-xs text-accent hover:underline"
                >
                  + Pacient nou
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
              className="w-full px-3 py-2 border border-border bg-white text-sm"
            >
              <option value="">— alegeți —</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title} ({s.duration} min)
                </option>
              ))}
            </select>
          </div>

          {/* Date / Duration */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                Data și ora *
              </label>
              <input
                type="datetime-local"
                required
                value={dateTime}
                onChange={(e) => setDateTime(e.target.value)}
                className="w-full px-3 py-2 border border-border bg-white text-sm"
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
                className="w-full px-3 py-2 border border-border bg-white text-sm"
              />
            </div>
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
              className="w-full px-3 py-2 border border-border bg-white text-sm"
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
