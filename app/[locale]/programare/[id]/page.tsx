"use client";

import { useEffect, useState, use } from "react";
import { useSearchParams } from "next/navigation";

interface ApptInfo {
  id: string;
  dateTime: string;
  duration: number;
  status: "pending" | "confirmed" | "cancelled" | "completed" | "noshow";
  patient: { name: string };
  service: { title: string };
}

export default function PublicAppointmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const search = useSearchParams();
  const token = search.get("token") || "";

  const [appt, setAppt] = useState<ApptInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<"confirmed" | "cancelled" | null>(null);

  useEffect(() => {
    fetch(`/api/public/appointments/${id}?token=${encodeURIComponent(token)}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Eroare");
        setAppt(data);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, token]);

  const submit = async (action: "confirm" | "cancel") => {
    setSubmitting(true);
    setError(null);
    try {
      const r = await fetch(`/api/public/appointments/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, action }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Eroare");
      setDone(action === "confirm" ? "confirmed" : "cancelled");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Eroare");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString("ro-RO", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16 bg-muted">
      <div className="w-full max-w-md bg-white border border-border p-8">
        <h1 className="font-serif text-2xl font-medium text-foreground mb-1">
          Programarea dvs.
        </h1>
        <p className="text-sm text-muted-foreground mb-6">TechnicalDent</p>

        {loading && <p className="text-muted-foreground">Se încarcă...</p>}

        {error && (
          <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {appt && !done && (
          <>
            <dl className="space-y-3 text-sm mb-6">
              <div>
                <dt className="text-muted-foreground">Pacient</dt>
                <dd className="font-medium text-foreground">
                  {appt.patient.name}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Serviciu</dt>
                <dd className="font-medium text-foreground">
                  {appt.service.title}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Data și ora</dt>
                <dd className="font-medium text-foreground">
                  {formatDate(appt.dateTime)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Status curent</dt>
                <dd className="font-medium text-foreground capitalize">
                  {appt.status}
                </dd>
              </div>
            </dl>

            {(appt.status === "pending" || appt.status === "confirmed") && (
              <div className="grid grid-cols-2 gap-3">
                <button
                  disabled={submitting || appt.status === "confirmed"}
                  onClick={() => submit("confirm")}
                  className="bg-foreground text-white px-4 py-3 text-sm font-medium hover:bg-foreground/90 disabled:opacity-50"
                >
                  {appt.status === "confirmed" ? "Confirmată" : "Confirmă"}
                </button>
                <button
                  disabled={submitting}
                  onClick={() => submit("cancel")}
                  className="border border-border bg-white text-foreground px-4 py-3 text-sm font-medium hover:bg-muted disabled:opacity-50"
                >
                  Anulează
                </button>
              </div>
            )}
          </>
        )}

        {done === "confirmed" && (
          <div className="rounded border border-green-200 bg-green-50 px-4 py-4 text-sm text-green-800">
            Mulțumim! Programarea dvs. a fost confirmată.
          </div>
        )}
        {done === "cancelled" && (
          <div className="rounded border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800">
            Programarea dvs. a fost anulată. Pentru reprogramare, ne puteți
            contacta.
          </div>
        )}
      </div>
    </div>
  );
}
