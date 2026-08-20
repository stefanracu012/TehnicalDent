"use client";

import { useCallback, useEffect, useState } from "react";
import { secureFetch } from "@/lib/csrf-client";
import type { AdsReport } from "@/lib/meta-ads";
import type { AdsAnalysis } from "@/lib/ads-ai";
import AdsChat from "@/components/admin/AdsChat";
import AdsCharts from "@/components/admin/AdsCharts";

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

/** Every block says what it shows, and how to read it, before showing it. */
function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-5">
        <h2 className="font-serif text-xl font-medium text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl leading-relaxed">
          {subtitle}
        </p>
      </div>
      {children}
    </section>
  );
}

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
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 sm:py-14">
        <header className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 mb-12">
          <div>
            <h1 className="font-serif text-3xl sm:text-4xl font-medium text-foreground">
              Reclame
            </h1>
            <p className="mt-3 text-sm text-muted-foreground max-w-xl leading-relaxed">
              Tot ce a rulat pe contul de reclame, cu cât a costat fiecare pacient
              potențial. Pagina citește datele salvate, deci se deschide instant.
            </p>
            <p className="mt-3 text-xs text-muted-foreground">
              {snapshot
                ? `Date de la ${new Date(snapshot.fetchedAt).toLocaleString("ro-RO")}`
                : "Niciun raport salvat încă"}
              {snapshot?.fetchedBy ? ` · ${snapshot.fetchedBy}` : ""}
            </p>
          </div>
          <div className="flex flex-col items-start sm:items-end gap-2 shrink-0">
            <button
              onClick={refresh}
              disabled={refreshing || refreshesLeft <= 0 || !configured}
              className="bg-foreground text-white text-sm font-semibold px-6 py-3 hover:bg-foreground/90 transition-colors disabled:opacity-50"
            >
              {refreshing ? "Se actualizează…" : "Reîmprospătează"}
            </button>
            <span className="text-xs text-muted-foreground">
              {refreshesLeft} din 3 rămase în ora aceasta
            </span>
          </div>
        </header>

        {!configured && (
          <div className="border border-yellow-300 bg-yellow-50 text-yellow-800 px-5 py-4 text-sm mb-10">
            Lipsesc <code>META_ADS_TOKEN</code> sau <code>META_AD_ACCOUNT_ID</code>{" "}
            din variabilele de mediu.
          </div>
        )}

        {error && (
          <div className="border border-red-200 bg-red-50 text-red-700 px-5 py-4 text-sm mb-10">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-muted-foreground">Se încarcă…</p>
        ) : !report ? (
          <div className="bg-background border border-border p-12 text-center">
            <p className="text-muted-foreground">
              Apasă Reîmprospătează ca să tragi datele din Meta pentru prima dată.
            </p>
          </div>
        ) : (
          <div className="space-y-16">
            <Section
              title="Pe scurt"
              subtitle="Totalul întregului istoric al contului. Conversații sunt oamenii care au deschis un chat cu pagina; contacte sunt cei care au lăsat datele sau au cerut o programare."
            >
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
                  <div key={s.label} className="bg-background p-5 sm:p-6">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                      {s.label}
                    </p>
                    <p className="font-serif text-2xl font-medium text-foreground tabular-nums">
                      {s.value}
                    </p>
                    {s.sub && (
                      <p className="text-xs text-muted-foreground mt-1.5">{s.sub}</p>
                    )}
                  </div>
                ))}
              </div>
            </Section>

            {analysis && (
              <Section
                title="Ce se întâmplă"
                subtitle="Citirea cifrelor de mai jos, în cuvinte. Constatările sunt marcate după cât de sigure sunt: Merge înseamnă confirmat de destule date, De verificat înseamnă un semnal prea slab ca să acționezi pe el încă."
              >
                <div className="bg-background border border-border">
                  <div className="px-6 py-6 border-b border-border">
                    <p className="font-serif text-lg text-foreground leading-snug max-w-3xl">
                      {analysis.headline}
                    </p>
                  </div>

                  <div className="divide-y divide-border">
                    {analysis.findings.map((f, i) => {
                      const sev = SEVERITY[f.severity] ?? SEVERITY.warn;
                      return (
                        <div key={i} className="px-6 py-5">
                          <div className="flex items-center gap-2.5 mb-2">
                            <h3 className="font-semibold text-sm text-foreground">
                              {f.title}
                            </h3>
                            <span
                              className={`px-2 py-0.5 text-xs font-semibold rounded-full ${sev.className}`}
                            >
                              {sev.label}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground leading-relaxed max-w-3xl">
                            {f.detail}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  {analysis.actions.length > 0 && (
                    <div className="px-6 py-6 border-t border-border bg-muted/40">
                      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-4">
                        De făcut, în ordinea impactului
                      </p>
                      <ol className="space-y-5">
                        {analysis.actions.map((a, i) => (
                          <li key={i} className="flex gap-4">
                            <span className="text-xs font-semibold text-accent tabular-nums pt-1">
                              {String(i + 1).padStart(2, "0")}
                            </span>
                            <div>
                              <p className="text-sm font-semibold text-foreground">
                                {a.title}
                              </p>
                              <p className="text-sm text-muted-foreground leading-relaxed max-w-3xl mt-1">
                                {a.detail}
                              </p>
                            </div>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}

                  {analysis.caveats.length > 0 && (
                    <div className="px-6 py-6 border-t border-border">
                      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
                        Ce nu spun cifrele astea
                      </p>
                      <ul className="space-y-2.5">
                        {analysis.caveats.map((c, i) => (
                          <li
                            key={i}
                            className="text-sm text-muted-foreground leading-relaxed max-w-3xl"
                          >
                            — {c}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </Section>
            )}

            <Section
              title="Evoluție"
              subtitle="Banii și rezultatele, zi cu zi, pe ultimele 90 de zile. Sunt două grafice separate pentru că sunt unități diferite — suprapuse pe aceeași axă ar sugera o legătură pe care datele nu o susțin. Treci cu mouse-ul peste grafic pentru ziua exactă."
            >
              <AdsCharts report={report} />
            </Section>

            <Section
              title="Unde se pierd conversațiile"
              subtitle="Din câți au deschis chatul, câți au ajuns până la capăt. Fiecare treaptă e raportată la prima, nu la cea dinaintea ei, ca să se vadă pierderea totală."
            >
              <div className="bg-background border border-border p-6 sm:p-8">
                <div className="space-y-2.5">
                  {report.funnel.map((step, i) => {
                    const pct = Math.round((step.value / funnelTop) * 1000) / 10;
                    // One hue, deepening down the funnel: these are stages of the
                    // same thing, not different categories.
                    const shade =
                      0.14 + (i / Math.max(report.funnel.length - 1, 1)) * 0.5;
                    return (
                      <div
                        key={step.label}
                        className="grid grid-cols-1 sm:grid-cols-[240px_1fr] sm:items-center gap-1.5 sm:gap-4"
                      >
                        <span className="text-sm text-muted-foreground sm:text-right">
                          {step.label}
                        </span>
                        <div className="flex items-center gap-3">
                          <div
                            className="h-10 flex items-center px-3 min-w-[3.5rem] rounded-r-[3px]"
                            style={{
                              width: `${Math.max(pct, 5)}%`,
                              backgroundColor: `rgba(79, 70, 229, ${shade})`,
                              borderLeft: "3px solid #4F46E5",
                            }}
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
                  <p className="text-xs text-muted-foreground mt-6">
                    {report.totals.blocks} persoane au blocat pagina după ce au
                    primit un mesaj.
                  </p>
                )}
              </div>
            </Section>

            <Section
              title="Fiecare reclamă"
              subtitle="Ordonate după buget consumat. Coloana Adânc. numără discuțiile în care omul a trimis cel puțin cinci mesaje — semnul unei conversații reale, nu al unui click curios."
            >
              <div className="bg-background border border-border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/60 text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="text-left font-medium px-5 py-3.5">Reclamă</th>
                      <th className="text-right font-medium px-5 py-3.5">Cheltuit</th>
                      <th className="text-right font-medium px-5 py-3.5">CTR</th>
                      <th className="text-right font-medium px-5 py-3.5">Conv.</th>
                      <th className="text-right font-medium px-5 py-3.5">Cost/conv.</th>
                      <th className="text-right font-medium px-5 py-3.5">Adânc.</th>
                      <th className="text-right font-medium px-5 py-3.5">Contacte</th>
                      <th className="text-right font-medium px-5 py-3.5">
                        Cost/contact
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {report.ads.map((ad, i) => (
                      <tr key={i} className="hover:bg-muted/40">
                        <td className="px-5 py-4">
                          <span className="text-foreground">{ad.name}</span>
                          <span className="block text-xs text-muted-foreground mt-1">
                            {ad.campaign}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right tabular-nums text-muted-foreground">
                          {money(ad.spend, currency)}
                        </td>
                        <td className="px-5 py-4 text-right tabular-nums text-muted-foreground">
                          {ad.ctr} %
                        </td>
                        <td className="px-5 py-4 text-right tabular-nums text-muted-foreground">
                          {ad.connections}
                        </td>
                        <td className="px-5 py-4 text-right tabular-nums text-muted-foreground">
                          {ad.costPerConnection
                            ? money(ad.costPerConnection, currency)
                            : "—"}
                        </td>
                        <td className="px-5 py-4 text-right tabular-nums text-muted-foreground">
                          {ad.deep}
                        </td>
                        <td className="px-5 py-4 text-right tabular-nums font-semibold text-foreground">
                          {ad.leads}
                        </td>
                        <td className="px-5 py-4 text-right tabular-nums text-foreground">
                          {ad.costPerLead ? money(ad.costPerLead, currency) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>

            <Section
              title="Campanii"
              subtitle="Gruparea de deasupra reclamelor. Obiectivul contează: o campanie setată pe vânzări e livrată de Meta altfel decât una setată pe conversații."
            >
              <div className="bg-background border border-border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/60 text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="text-left font-medium px-5 py-3.5">Campanie</th>
                      <th className="text-left font-medium px-5 py-3.5">Stare</th>
                      <th className="text-right font-medium px-5 py-3.5">Cheltuit</th>
                      <th className="text-right font-medium px-5 py-3.5">Conv.</th>
                      <th className="text-right font-medium px-5 py-3.5">Contacte</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {report.campaigns.map((c, i) => (
                      <tr key={i} className="hover:bg-muted/40">
                        <td className="px-5 py-4">
                          <span className="text-foreground">{c.name}</span>
                          <span className="block text-xs text-muted-foreground mt-1">
                            {c.objective}
                          </span>
                        </td>
                        <td className="px-5 py-4">
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
                        <td className="px-5 py-4 text-right tabular-nums text-muted-foreground">
                          {money(c.spend, currency)}
                        </td>
                        <td className="px-5 py-4 text-right tabular-nums text-muted-foreground">
                          {c.connections}
                        </td>
                        <td className="px-5 py-4 text-right tabular-nums font-semibold text-foreground">
                          {c.leads}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>

            <p className="text-xs text-muted-foreground pb-20 max-w-2xl leading-relaxed">
              Date citite din Meta Marketing API. Pagina nu modifică nimic în contul
              de reclame — doar citește.
            </p>
          </div>
        )}
      </div>

      <AdsChat disabled={!report} />
    </div>
  );
}
