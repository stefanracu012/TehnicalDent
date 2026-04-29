"use client";

import { useEffect, useState, useCallback } from "react";
import { secureFetch } from "@/lib/csrf-client";

interface PatientListItem {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  createdAt: string;
  _count: { appointments: number };
}

interface AppointmentHistoryItem {
  id: string;
  dateTime: string;
  status: string;
  notes?: string | null;
  service: { id: string; title: string; slug: string; duration: number };
}

interface PatientDetail extends PatientListItem {
  notes?: string | null;
  appointments: AppointmentHistoryItem[];
}

const emptyForm = { name: "", phone: "", email: "", notes: "" };

const statusColor: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  confirmed: "bg-green-100 text-green-800 border-green-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
  completed: "bg-blue-100 text-blue-800 border-blue-200",
  noshow: "bg-gray-100 text-gray-700 border-gray-200",
};

export default function AdminPatientsPage() {
  const [patients, setPatients] = useState<PatientListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<PatientListItem | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [detail, setDetail] = useState<PatientDetail | null>(null);

  const fetchPatients = useCallback(async () => {
    setLoading(true);
    try {
      const url = q ? `/api/admin/patients?q=${encodeURIComponent(q)}` : "/api/admin/patients";
      const res = await secureFetch(url);
      const data = await res.json();
      setPatients(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [q]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  const openNew = () => {
    setEditing(null);
    setFormData(emptyForm);
    setErrorMsg(null);
    setShowForm(true);
  };

  const openEdit = (p: PatientListItem) => {
    setEditing(p);
    setFormData({
      name: p.name,
      phone: p.phone,
      email: p.email || "",
      notes: "",
    });
    setErrorMsg(null);
    setShowForm(true);
    // Load full record to get notes
    secureFetch(`/api/admin/patients/${p.id}`)
      .then((r) => r.json())
      .then((d) =>
        setFormData((prev) => ({ ...prev, notes: d.notes || "" })),
      )
      .catch(() => {});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);
    try {
      const url = editing ? `/api/admin/patients/${editing.id}` : "/api/admin/patients";
      const method = editing ? "PATCH" : "POST";
      const res = await secureFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Eroare salvare");
      setShowForm(false);
      fetchPatients();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Eroare");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Sigur ștergeți pacientul? Programările aferente vor fi șterse.")) return;
    await secureFetch(`/api/admin/patients/${id}`, { method: "DELETE" });
    fetchPatients();
  };

  const openHistory = async (id: string) => {
    const res = await secureFetch(`/api/admin/patients/${id}`);
    const data = await res.json();
    setDetail(data);
  };

  const formatDate = (s: string) =>
    new Date(s).toLocaleString("ro-RO", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="min-h-screen bg-muted pt-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-12">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-medium text-foreground">
              Pacienți
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Gestionați baza de date a pacienților și istoricul programărilor.
            </p>
          </div>
          <div className="flex gap-2">
            <input
              type="search"
              placeholder="Caută nume, telefon, email..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="px-3 py-2 border border-border bg-white text-sm w-full sm:w-72"
            />
            <button
              onClick={openNew}
              className="bg-foreground text-white px-4 py-2 text-sm font-medium hover:bg-foreground/90 whitespace-nowrap"
            >
              + Pacient nou
            </button>
          </div>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Se încarcă...</p>
        ) : patients.length === 0 ? (
          <div className="bg-white border border-border p-8 text-center text-muted-foreground">
            Niciun pacient înregistrat.
          </div>
        ) : (
          <div className="bg-white border border-border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Nume</th>
                  <th className="px-4 py-3 font-medium">Telefon</th>
                  <th className="px-4 py-3 font-medium hidden md:table-cell">Email</th>
                  <th className="px-4 py-3 font-medium text-center">Programări</th>
                  <th className="px-4 py-3 font-medium hidden md:table-cell">Adăugat</th>
                  <th className="px-4 py-3 font-medium text-right">Acțiuni</th>
                </tr>
              </thead>
              <tbody>
                {patients.map((p) => (
                  <tr key={p.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{p.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.phone}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                      {p.email || "—"}
                    </td>
                    <td className="px-4 py-3 text-center">{p._count.appointments}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                      {formatDate(p.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => openHistory(p.id)}
                        className="text-xs px-2 py-1 border border-border hover:bg-muted"
                      >
                        Istoric
                      </button>
                      <button
                        onClick={() => openEdit(p)}
                        className="text-xs px-2 py-1 border border-border hover:bg-muted"
                      >
                        Editează
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="text-xs px-2 py-1 border border-red-200 text-red-700 hover:bg-red-50"
                      >
                        Șterge
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-4">
          <div className="bg-white max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="font-serif text-xl font-medium mb-4">
              {editing ? "Editează pacient" : "Pacient nou"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                  Nume *
                </label>
                <input
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-border bg-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                  Telefon *
                </label>
                <input
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+373..."
                  className="w-full px-3 py-2 border border-border bg-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-border bg-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                  Note medicale / observații
                </label>
                <textarea
                  rows={4}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-border bg-white text-sm"
                />
              </div>

              {errorMsg && (
                <div className="text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-2">
                  {errorMsg}
                </div>
              )}

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-sm border border-border hover:bg-muted"
                >
                  Anulează
                </button>
                <button
                  disabled={saving}
                  type="submit"
                  className="bg-foreground text-white px-4 py-2 text-sm font-medium hover:bg-foreground/90 disabled:opacity-50"
                >
                  {saving ? "Se salvează..." : "Salvează"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History modal */}
      {detail && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-4">
          <div className="bg-white max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="font-serif text-xl font-medium">{detail.name}</h2>
                <p className="text-sm text-muted-foreground">{detail.phone}</p>
                {detail.email && (
                  <p className="text-sm text-muted-foreground">{detail.email}</p>
                )}
              </div>
              <button
                onClick={() => setDetail(null)}
                className="text-muted-foreground hover:text-foreground text-xl leading-none"
              >
                ×
              </button>
            </div>

            {detail.notes && (
              <div className="bg-muted/50 border border-border p-3 text-sm mb-6">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                  Note medicale
                </p>
                <p className="whitespace-pre-wrap">{detail.notes}</p>
              </div>
            )}

            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Istoric programări ({detail.appointments.length})
            </h3>
            {detail.appointments.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nicio programare.</p>
            ) : (
              <ul className="divide-y divide-border border border-border">
                {detail.appointments.map((a) => (
                  <li key={a.id} className="px-3 py-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{a.service.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(a.dateTime)} · {a.service.duration} min
                      </p>
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 border rounded ${statusColor[a.status] || ""}`}
                    >
                      {a.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
