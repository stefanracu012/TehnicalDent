"use client";

import { useState, useEffect } from "react";
import { secureFetch } from "@/lib/csrf-client";

interface Patient {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
}

type TemplateKey = "oferta_speciala" | "reminder_control";

export default function AdminCampaniiPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  const [templateKey, setTemplateKey] = useState<TemplateKey>("oferta_speciala");
  const [service, setService] = useState("");
  const [discount, setDiscount] = useState("");
  const [detail, setDetail] = useState("");
  const [channelWhatsapp, setChannelWhatsapp] = useState(true);
  const [channelEmail, setChannelEmail] = useState(true);

  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; skipped: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPatients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const fetchPatients = async () => {
    setLoading(true);
    try {
      const qs = search ? `?q=${encodeURIComponent(search)}` : "";
      const res = await secureFetch(`/api/admin/patients${qs}`);
      const data = await res.json();
      setPatients(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const toggle = (id: string) => {
    setSelectAll(false);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const recipientCount = selectAll ? "toți pacienții" : `${selected.size} pacient${selected.size !== 1 ? "i" : ""}`;

  const canSend =
    (selectAll || selected.size > 0) &&
    (channelWhatsapp || channelEmail) &&
    (templateKey === "oferta_speciala" ? service.trim() && discount.trim() : detail.trim());

  const send = async () => {
    if (!canSend) return;
    const confirmMsg = selectAll
      ? `Sigur trimiți acest mesaj către TOȚI pacienții (${patients.length}+ posibil, indiferent de filtrul curent)?`
      : `Trimiți acest mesaj către ${selected.size} pacient${selected.size !== 1 ? "i" : ""}?`;
    if (!confirm(confirmMsg)) return;

    setSending(true);
    setError(null);
    setResult(null);
    try {
      const res = await secureFetch("/api/admin/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientIds: selectAll ? "all" : Array.from(selected),
          templateKey,
          service: templateKey === "oferta_speciala" ? service.trim() : undefined,
          discount: templateKey === "oferta_speciala" ? discount.trim() : undefined,
          detail: templateKey === "reminder_control" ? detail.trim() : undefined,
          channels: { whatsapp: channelWhatsapp, email: channelEmail },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Eroare la trimitere.");
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Eroare necunoscută.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-6 sm:py-12">
        <div className="mb-6 sm:mb-10">
          <h1 className="font-serif text-2xl sm:text-3xl font-medium text-foreground">
            Campanii
          </h1>
          <p className="mt-2 text-muted-foreground">
            Trimite oferte sau remindere către unul, mai mulți sau toți pacienții, pe WhatsApp și email.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Patient selection */}
          <div className="bg-background border border-border p-4 sm:p-6">
            <h2 className="font-serif text-lg font-medium text-foreground mb-4">Destinatari</h2>

            <label className="flex items-center gap-2 mb-3 text-sm font-medium">
              <input
                type="checkbox"
                checked={selectAll}
                onChange={(e) => {
                  setSelectAll(e.target.checked);
                  if (e.target.checked) setSelected(new Set());
                }}
              />
              Toți pacienții (indiferent de căutare)
            </label>

            <input
              type="search"
              placeholder="Caută pacient după nume/telefon..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              disabled={selectAll}
              className="w-full px-3 py-2 border border-border bg-background text-sm mb-3 disabled:opacity-50"
            />

            <div className="max-h-80 overflow-y-auto border border-border divide-y divide-border">
              {loading ? (
                <p className="p-4 text-sm text-muted-foreground">Se încarcă...</p>
              ) : patients.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">Niciun pacient găsit.</p>
              ) : (
                patients.map((p) => (
                  <label
                    key={p.id}
                    className={`flex items-center gap-3 px-3 py-2 text-sm cursor-pointer hover:bg-muted ${
                      selectAll ? "opacity-50" : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectAll || selected.has(p.id)}
                      disabled={selectAll}
                      onChange={() => toggle(p.id)}
                    />
                    <span className="flex-1">
                      {p.name} <span className="text-muted-foreground">— {p.phone}</span>
                    </span>
                  </label>
                ))
              )}
            </div>

            <p className="text-xs text-muted-foreground mt-2">
              Selectați: <span className="font-medium text-foreground">{recipientCount}</span>
            </p>
          </div>

          {/* Message composition */}
          <div className="bg-background border border-border p-4 sm:p-6">
            <h2 className="font-serif text-lg font-medium text-foreground mb-4">Mesaj</h2>

            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={() => setTemplateKey("oferta_speciala")}
                className={`flex-1 px-3 py-2 text-sm border ${
                  templateKey === "oferta_speciala"
                    ? "bg-foreground text-background border-foreground"
                    : "border-border hover:bg-muted"
                }`}
              >
                🎁 Ofertă specială
              </button>
              <button
                type="button"
                onClick={() => setTemplateKey("reminder_control")}
                className={`flex-1 px-3 py-2 text-sm border ${
                  templateKey === "reminder_control"
                    ? "bg-foreground text-background border-foreground"
                    : "border-border hover:bg-muted"
                }`}
              >
                🔔 Reminder control
              </button>
            </div>

            {templateKey === "oferta_speciala" ? (
              <div className="space-y-3 mb-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Serviciu
                  </label>
                  <input
                    type="text"
                    value={service}
                    onChange={(e) => setService(e.target.value)}
                    placeholder="ex: Albire dentară"
                    className="w-full px-3 py-2 border border-border bg-background text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Reducere
                  </label>
                  <input
                    type="text"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    placeholder="ex: 20%"
                    className="w-full px-3 py-2 border border-border bg-background text-sm"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Previzualizare: „Avem o ofertă specială la TechnicalDent:{" "}
                  <b>{service || "…"}</b>, cu reducere de <b>{discount || "…"}</b>. Vă așteptăm cu drag!"
                </p>
              </div>
            ) : (
              <div className="space-y-3 mb-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Detaliu reminder
                  </label>
                  <textarea
                    value={detail}
                    onChange={(e) => setDetail(e.target.value)}
                    rows={3}
                    placeholder="ex: Este recomandat un control la fiecare 6 luni."
                    className="w-full px-3 py-2 border border-border bg-background text-sm"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Previzualizare: „Vă reamintim de un control recomandat la TechnicalDent.{" "}
                  {detail || "…"}. Vă așteptăm!"
                </p>
              </div>
            )}

            <div className="flex gap-4 mb-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={channelWhatsapp}
                  onChange={(e) => setChannelWhatsapp(e.target.checked)}
                />
                WhatsApp
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={channelEmail}
                  onChange={(e) => setChannelEmail(e.target.checked)}
                />
                Email
              </label>
            </div>

            {error && (
              <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 mb-4">
                {error}
              </div>
            )}
            {result && (
              <div className="rounded border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800 mb-4">
                Trimis către {result.sent} din {result.total} pacienți
                {result.skipped > 0 ? ` (${result.skipped} săriți — fără telefon/email)` : ""}.
              </div>
            )}

            <button
              type="button"
              onClick={send}
              disabled={!canSend || sending}
              className="w-full px-4 py-2.5 bg-foreground text-background text-sm font-medium disabled:opacity-50"
            >
              {sending ? "Se trimite..." : `Trimite către ${recipientCount}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
