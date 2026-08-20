"use client";

import { useCallback, useEffect, useState } from "react";
import { secureFetch } from "@/lib/csrf-client";
import type { AdsReport } from "@/lib/meta-ads";
import type { AdsAnalysis } from "@/lib/ads-ai";
import AdsChat from "@/components/admin/AdsChat";

interface Snapshot {
  id: string;
  data: AdsReport;
  analysis: string | null;
  fetchedAt: string;
  fetchedBy: string | null;
}

const SEVERITY: Record<string, { label: string; className: string }> = {
  good: { label: "Merge", className: "bg-green-100 text-green-700" },
  warn: { label: "De verificat", className: "bg-yellow-100 text-yellow-700" },
  bad: { label: "Pierdere", className: "bg-red-100 text-red-700" },
};

const money = (n: number, currency: string) =>
  `${n.toLocaleString("ro-RO", { maximumFractionDigits: 2 })} ${currency}`;

export default function AdminAdsPage() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [refreshesLeft, setRefreshesLeft] = useState(3);
  const [configured, setConfigured] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await secureFetch("/api/admin/ads");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Eroare la încărcare");
      setSnapshot(data.snapshot);
      setRefreshesLeft(data.refreshesLeft);
      setConfigured(data.configured);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = async () => {
    setRefreshing(true);
    setError(null);
    try {
      const res = await secureFetch("/api/admin/ads", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Eroare la reîmprospătare");
      setSnapshot(data.snapshot);
      setRefreshesLeft(data.refreshesLeft);
      if (data.analysisFailed) {
        setError("Datele s-au actualizat, dar analiza AI nu a putut fi generată.");
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRefreshing(false);
    }
  };

  const report = snapshot?.data ?? null;
  const currency = report?.currency ?? "USD";

  let analysis: AdsAnalysis | null = null;
  if (snapshot?.analysis) {
    try {
      analysis = JSON.parse(snapshot.analysis) as AdsAnalysis;
    } catch {
      analysis = null;
    }
  }

  const funnelTop = report?.funnel?.[0]?.value || 1;

  return (
    <div className="min-h-screen bg-muted">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6 sm:py-12">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-medium text-foreground">
              Reclame
            </h1>
            <p className="mt-1 sm:mt-2 text-sm text-muted-foreground">
              {snapshot
                ? `Date de la ${new Date(snapshot.fetchedAt).toLocaleString("ro-RO")}`
                : "Niciun raport salvat încă"}
              {snapshot?.fetchedBy ? ` · ${snapshot.fetchedBy}` : ""}
            </p>
          </div>
          <div className="flex flex-col items-start sm:items-end gap-1">
            <button
              onClick={refresh}
              disabled={refreshing || refreshesLeft <= 0 || !configured}
              className="bg-foreground text-white text-sm font-semibold px-5 py-2.5 hover:bg-foreground/90 transition-colors disabled:opacity-50"
            >
              {refreshing ? "Se actualizează…" : "Reîmprospătează"}
            </button>
            <span className="text-xs text-muted-foreground">
              {refreshesLeft} din 3 rămase în ora aceasta
            </span>
          </div>
        </div>

        {!configured && (
          <div className="border border-yellow-300 bg-yellow-50 text-yellow-800 px-4 py-3 text-sm mb-6">
            Lipsesc <code>META_ADS_TOKEN</code> sau <code>META_AD_ACCOUNT_ID</code>{" "}
            din variabilele de mediu.
          </div>
        )}

        {error && (
          <div className="border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm mb-6">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-muted-foreground">Se încarcă…</p>
        ) : !report ? (
          <div className="bg-background border border-border p-8 text-center">
            <p className="text-muted-foreground mb-4">
              Apasă Reîmprospătează ca să tragi datele din Meta pentru prima dată.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Totals */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-px bg-border border border-border">
              {[
                { label: "Cheltuit", value: money(report.totals.spend, currency) },
                {
                  label: "Afișări",
                  value: report.totals.impressions.toLocaleString("ro-RO"),
                  sub: `${report.totals.reach.toLocaleString("ro-RO")} persoane`,
                },
                {
                  label: "CTR",
                  value: `${report.totals.ctr} %`,
                  sub: `${report.totals.clicks.toLocaleString("ro-RO")} clicuri`,
                },
                {
                  label: "Conversații",
                  value: String(report.totals.connections),
                  sub: report.totals.costPerConnection
                    ? `${money(report.totals.costPerConnection, currency)} fiecare`
                    : undefined,
                },
                {
                  label: "Cost / contact",
                  value: report.totals.costPerLead
                    ? money(report.totals.costPerLead, currency)
                    : "—",
                  sub: `${report.totals.leads} contacte`,
                },
              ].map((s) => (
                <div key={s.label} className="bg-background p-4">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                    {s.label}
                  </p>
                  <p className="font-serif text-xl font-medium text-foreground tabular-nums">
                    {s.value}
                  </p>
                  {s.sub && (
                    <p className="text-xs text-muted-foreground mt-0.5">{s.sub}</p>
                  )}
                </div>
              ))}
            </div>

            {/* AI analysis */}
            {analysis && (
              <section className="bg-background border border-border">
                <div className="px-5 py-4 border-b border-border">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                    Analiză
                  </p>
                  <p className="font-serif text-lg text-foreground leading-snug">
                    {analysis.headline}
                  </p>
                </div>

                <div className="divide-y divide-border">
                  {analysis.findings.map((f, i) => {
                    const sev = SEVERITY[f.severity] ?? SEVERITY.warn;
                    return (
                      <div key={i} className="px-5 py-4">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-sm text-foreground">
                            {f.title}
                          </h3>
                          <span
                            className={`px-2 py-0.5 text-xs font-semibold rounded-full ${sev.className}`}
                          >
                            {sev.label}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {f.detail}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {analysis.actions.length > 0 && (
                  <div className="px-5 py-4 border-t border-border bg-muted/40">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
                      De făcut
                    </p>
                    <ol className="space-y-3">
                      {analysis.actions.map((a, i) => (
                        <li key={i} className="flex gap-3">
                          <span className="text-xs font-semibold text-accent tabular-nums pt-0.5">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <div>
                            <p className="text-sm font-semibold text-foreground">
                              {a.title}
                            </p>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              {a.detail}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {analysis.caveats.length > 0 && (
                  <div className="px-5 py-4 border-t border-border">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                      Ce nu spun cifrele
                    </p>
                    <ul className="space-y-1.5">
                      {analysis.caveats.map((c, i) => (
                        <li key={i} className="text-sm text-muted-foreground">
                          — {c}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
            )}

            <AdsChat />

            {/* Funnel */}
            <section className="bg-background border border-border p-5">
              <h2 className="font-serif text-lg font-medium text-foreground mb-1">
                Unde se pierd conversațiile
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                Fiecare treaptă, raportată la câți au deschis chatul.
              </p>
              <div className="space-y-1">
                {report.funnel.map((step) => {
                  const pct = Math.round((step.value / funnelTop) * 1000) / 10;
                  return (
                    <div
                      key={step.label}
                      className="grid grid-cols-1 sm:grid-cols-[220px_1fr] sm:items-center gap-1 sm:gap-3"
                    >
                      <span className="text-sm text-muted-foreground sm:text-right">
                        {step.label}
                      </span>
                      <div className="flex items-center gap-2">
                        <div
                          className="h-7 bg-accent/15 border-l-2 border-accent flex items-center px-2 min-w-[3rem]"
                          style={{ width: `${Math.max(pct, 4)}%` }}
                        >
                          <span className="text-sm font-semibold text-foreground tabular-nums">
                            {step.value.toLocaleString("ro-RO")}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {pct} %
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
              {report.totals.blocks > 0 && (
                <p className="text-xs text-muted-foreground mt-4">
                  {report.totals.blocks} persoane au blocat pagina după ce au primit
                  un mesaj.
                </p>
              )}
            </section>

            {/* Ads table */}
            <section className="bg-background border border-border">
              <div className="px-5 py-4 border-b border-border">
                <h2 className="font-serif text-lg font-medium text-foreground">
                  Reclame
                </h2>
                <p className="text-sm text-muted-foreground">
                  Ordonate după buget consumat. Coloana Adânc. numără discuțiile cu 5+ mesaje.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/60 text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="text-left font-medium px-4 py-2.5">Reclamă</th>
                      <th className="text-right font-medium px-4 py-2.5">Cheltuit</th>
                      <th className="text-right font-medium px-4 py-2.5">CTR</th>
                      <th className="text-right font-medium px-4 py-2.5">Conv.</th>
                      <th className="text-right font-medium px-4 py-2.5">Adânc.</th>
                      <th className="text-right font-medium px-4 py-2.5">Contacte</th>
                      <th className="text-right font-medium px-4 py-2.5">Cost/contact</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {report.ads.map((ad, i) => (
                      <tr key={i} className="hover:bg-muted/40">
                        <td className="px-4 py-2.5">
                          <span className="text-foreground">{ad.name}</span>
                          <span className="block text-xs text-muted-foreground">
                            {ad.campaign}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                          {money(ad.spend, currency)}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                          {ad.ctr} %
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                          {ad.connections}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                          {ad.deep}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-foreground">
                          {ad.leads}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-foreground">
                          {ad.costPerLead ? money(ad.costPerLead, currency) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Campaigns */}
            <section className="bg-background border border-border">
              <div className="px-5 py-4 border-b border-border">
                <h2 className="font-serif text-lg font-medium text-foreground">
                  Campanii
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/60 text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="text-left font-medium px-4 py-2.5">Campanie</th>
                      <th className="text-left font-medium px-4 py-2.5">Stare</th>
                      <th className="text-right font-medium px-4 py-2.5">Cheltuit</th>
                      <th className="text-right font-medium px-4 py-2.5">Conv.</th>
                      <th className="text-right font-medium px-4 py-2.5">Contacte</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {report.campaigns.map((c, i) => (
                      <tr key={i} className="hover:bg-muted/40">
                        <td className="px-4 py-2.5">
                          <span className="text-foreground">{c.name}</span>
                          <span className="block text-xs text-muted-foreground">
                            {c.objective}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span
                            className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                              c.status === "ACTIVE"
                                ? "bg-green-100 text-green-700"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {c.status === "ACTIVE" ? "Activă" : "Oprită"}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                          {money(c.spend, currency)}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                          {c.connections}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-foreground">
                          {c.leads}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <p className="text-xs text-muted-foreground">
              Date citite din Meta Marketing API. Pagina nu modifică nimic în contul
              de reclame — doar citește.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
