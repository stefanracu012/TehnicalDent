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

const STATUS_RO: Record<ApptInfo["status"], string> = {
  pending: "Așteaptă confirmarea dvs.",
  confirmed: "Confirmată",
  cancelled: "Anulată",
  completed: "Finalizată",
  noshow: "Neprezentat",
};

/**
 * The page behind the link in the WhatsApp and email messages.
 *
 * Cancelling takes two presses. It used to take one, with "Anulează" the only
 * button that still worked on a confirmed appointment, and patients whose
 * appointments were cancelled said they had not opened anything. Opening the
 * page never cancels: an email button can still confirm on its own, but its
 * cancel button only opens the question — a mail scanner following links must
 * not cancel anyone.
 */
export default function PublicAppointmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const search = useSearchParams();
  const token = search.get("token") || "";
  const urlAction = search.get("action"); // "confirm" | "cancel" from email links

  const [appt, setAppt] = useState<ApptInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<"confirmed" | "cancelled" | null>(null);
  const [askingCancel, setAskingCancel] = useState(false);

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
      setAskingCancel(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Eroare");
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    fetch(`/api/public/appointments/${id}?token=${encodeURIComponent(token)}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Eroare");
        setAppt(data);
        const open = data.status === "pending" || data.status === "confirmed";
        if (urlAction === "confirm" && data.status === "pending") submit("confirm");
        // Asks; never cancels by itself.
        if (urlAction === "cancel" && open) setAskingCancel(true);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, token]);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString("ro-RO", {
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Chisinau",
    });

  const status = done ?? appt?.status;
  const open = status === "pending" || status === "confirmed";

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16 bg-muted">
      <div className="w-full max-w-md bg-background border border-border p-8">
        <h1 className="font-serif text-2xl font-medium text-foreground mb-1">
          Programarea dvs.
        </h1>
        <p className="text-sm text-muted-foreground mb-6">TehnicalDent</p>

        {loading && <p className="text-muted-foreground">Se încarcă...</p>}

        {error && (
          <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {appt && status && (
          <>
            <dl className="space-y-3 text-sm mb-6">
              <div>
                <dt className="text-muted-foreground">Pacient</dt>
                <dd className="font-medium text-foreground">{appt.patient.name}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Serviciu</dt>
                <dd className="font-medium text-foreground">{appt.service.title}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Data și ora</dt>
                <dd className="font-medium text-foreground first-letter:uppercase">
                  {formatDate(appt.dateTime)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Status</dt>
                <dd className="font-medium text-foreground">{STATUS_RO[status]}</dd>
              </div>
            </dl>

            {status === "confirmed" && !askingCancel && (
              <div className="rounded border border-green-200 bg-green-50 px-4 py-4 text-sm text-green-800">
                ✓ Programarea este confirmată. Vă așteptăm!
              </div>
            )}

            {status === "pending" && !askingCancel && (
              <button
                disabled={submitting}
                onClick={() => submit("confirm")}
                className="w-full bg-foreground text-white px-4 py-3 text-sm font-medium hover:bg-foreground/90 disabled:opacity-50"
              >
                {submitting ? "Se confirmă..." : "Confirm programarea"}
              </button>
            )}

            {open && !askingCancel && (
              <button
                onClick={() => setAskingCancel(true)}
                className="mt-5 block mx-auto text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
              >
                Nu mai pot veni — vreau să anulez
              </button>
            )}

            {open && askingCancel && (
              <div className="rounded border border-amber-200 bg-amber-50 px-4 py-4">
                <p className="text-sm text-amber-900 mb-4">
                  Sigur anulați programarea din{" "}
                  <span className="font-medium">{formatDate(appt.dateTime)}</span>?
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    disabled={submitting}
                    onClick={() => setAskingCancel(false)}
                    className="bg-foreground text-white px-4 py-3 text-sm font-medium hover:bg-foreground/90 disabled:opacity-50"
                  >
                    Nu, păstrez
                  </button>
                  <button
                    disabled={submitting}
                    onClick={() => submit("cancel")}
                    className="border border-red-300 bg-background text-red-700 px-4 py-3 text-sm font-medium hover:bg-red-50 disabled:opacity-50"
                  >
                    {submitting ? "Se anulează..." : "Da, anulez"}
                  </button>
                </div>
              </div>
            )}

            {status === "cancelled" && (
              <div className="rounded border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800">
                Programarea a fost anulată. Pentru o altă oră, ne puteți suna sau scrie.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
