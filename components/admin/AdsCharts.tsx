"use client";

import { useState } from "react";
import type { AdsReport } from "@/lib/meta-ads";

/**
 * Three single-series charts rather than one crowded one.
 *
 * Spend and leads share an x-axis but never a y-axis: money and conversions are
 * different units, and putting them on two scales in one frame invites a
 * comparison the data cannot support. Small multiples say the same thing
 * honestly.
 */

const INDIGO = "#4F46E5";
const EMERALD = "#059669";
const AMBER = "#D97706";

const W = 720;
const H = 170;
const PAD = { top: 12, right: 10, bottom: 20, left: 10 };

interface Hover {
  x: number;
  label: string;
  value: string;
}

function useHover() {
  const [hover, setHover] = useState<Hover | null>(null);
  return { hover, setHover };
}

function Tooltip({ hover }: { hover: Hover | null }) {
  if (!hover) return null;
  const flip = hover.x > W * 0.7;
  return (
    <g transform={`translate(${hover.x}, 0)`} pointerEvents="none">
      <line
        y1={PAD.top}
        y2={H - PAD.bottom}
        stroke="currentColor"
        strokeWidth="1"
        className="text-foreground/25"
      />
      <text
        x={flip ? -8 : 8}
        y={PAD.top + 12}
        textAnchor={flip ? "end" : "start"}
        className="fill-foreground text-[11px] font-semibold"
      >
        {hover.value}
      </text>
      <text
        x={flip ? -8 : 8}
        y={PAD.top + 26}
        textAnchor={flip ? "end" : "start"}
        className="fill-muted-foreground text-[10px]"
      >
        {hover.label}
      </text>
    </g>
  );
}

function DailyChart({
  points,
  color,
  kind,
  format,
  title,
  subtitle,
}: {
  points: { date: string; value: number }[];
  color: string;
  kind: "area" | "bars";
  format: (n: number) => string;
  title: string;
  subtitle: string;
}) {
  const { hover, setHover } = useHover();

  if (points.length === 0) {
    return (
      <div className="p-5">
        <h3 className="font-serif text-base text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground mt-1">Nu există date zilnice.</p>
      </div>
    );
  }

  const max = Math.max(...points.map((p) => p.value), 1);
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const step = plotW / Math.max(points.length - 1, 1);
  const y = (v: number) => PAD.top + plotH - (v / max) * plotH;
  const x = (i: number) => PAD.left + i * step;

  const line = points.map((p, i) => `${i ? "L" : "M"}${x(i)},${y(p.value)}`).join(" ");
  const area = `${line} L${x(points.length - 1)},${PAD.top + plotH} L${x(0)},${PAD.top + plotH} Z`;

  const barW = Math.max(plotW / points.length - 1.5, 1.5);
  const total = points.reduce((s, p) => s + p.value, 0);
  const id = `grad-${title.replace(/\W/g, "")}`;

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString("ro-RO", { day: "numeric", month: "short" });

  return (
    <div className="p-5">
      <div className="flex items-baseline justify-between gap-3 mb-1">
        <h3 className="font-serif text-base text-foreground">{title}</h3>
        <span className="text-sm font-semibold tabular-nums" style={{ color }}>
          {format(total)}
        </span>
      </div>
      <p className="text-xs text-muted-foreground mb-3">{subtitle}</p>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto overflow-visible"
        role="img"
        aria-label={`${title}. Total ${format(total)}.`}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Baseline, recessive on purpose */}
        <line
          x1={PAD.left}
          x2={W - PAD.right}
          y1={PAD.top + plotH}
          y2={PAD.top + plotH}
          stroke="currentColor"
          strokeWidth="1"
          className="text-border"
        />

        {kind === "area" ? (
          <>
            <path d={area} fill={`url(#${id})`} />
            <path
              d={line}
              fill="none"
              stroke={color}
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </>
        ) : (
          points.map((p, i) => (
            <rect
              key={p.date}
              x={x(i) - barW / 2}
              y={y(p.value)}
              width={barW}
              height={Math.max(PAD.top + plotH - y(p.value), p.value > 0 ? 1.5 : 0)}
              fill={color}
              rx="1"
            />
          ))
        )}

        {/* One transparent column per point: a hit target far bigger than the mark */}
        {points.map((p, i) => (
          <rect
            key={`hit-${p.date}`}
            x={x(i) - step / 2}
            y={PAD.top}
            width={Math.max(step, 4)}
            height={plotH}
            fill="transparent"
            onMouseEnter={() =>
              setHover({
                x: x(i),
                label: fmtDate(p.date),
                value: format(p.value),
              })
            }
          />
        ))}

        <Tooltip hover={hover} />

        <text
          x={PAD.left}
          y={H - 4}
          className="fill-muted-foreground text-[10px]"
        >
          {fmtDate(points[0].date)}
        </text>
        <text
          x={W - PAD.right}
          y={H - 4}
          textAnchor="end"
          className="fill-muted-foreground text-[10px]"
        >
          {fmtDate(points[points.length - 1].date)}
        </text>
      </svg>
    </div>
  );
}

/**
 * Ads ranked by what one outcome cost, cheapest first.
 *
 * Rows built on too few conversions are drawn faint rather than hidden: they
 * are part of the spend and belong in the picture, but a cost derived from two
 * of anything is not a finding and should not look like one.
 */
function CostRanking({
  report,
  title,
  noun,
  color,
  cost,
  count,
  minimum,
}: {
  report: AdsReport;
  title: string;
  noun: string;
  color: string;
  cost: (a: AdsReport["ads"][number]) => number | null;
  count: (a: AdsReport["ads"][number]) => number;
  minimum: number;
}) {
  const rows = report.ads
    .filter((a) => cost(a) !== null && count(a) > 0)
    .sort((a, b) => (cost(a) ?? 0) - (cost(b) ?? 0));

  if (rows.length === 0) return null;

  const max = Math.max(...rows.map((r) => cost(r) ?? 0));

  return (
    <div className="p-5">
      <h3 className="font-serif text-base text-foreground mb-1">{title}</h3>
      <p className="text-xs text-muted-foreground mb-4">
        Mai scurt e mai bine. Barele palide au sub {minimum} {noun} — prea puține
        ca să fie o concluzie.
      </p>
      <div className="space-y-2">
        {rows.map((r, i) => {
          const value = cost(r) ?? 0;
          const n = count(r);
          return (
            <div
              key={i}
              className="grid grid-cols-1 sm:grid-cols-[190px_1fr] sm:items-center gap-1 sm:gap-3"
            >
              <span className="text-sm text-muted-foreground sm:text-right truncate">
                {r.name}
              </span>
              <div className="flex items-center gap-2">
                <div
                  className="h-5 rounded-r-[3px]"
                  style={{
                    width: `${Math.max((value / max) * 100, 1.5)}%`,
                    backgroundColor: color,
                    opacity: n < minimum ? 0.35 : 1,
                  }}
                />
                <span className="text-sm font-semibold text-foreground tabular-nums whitespace-nowrap">
                  {value.toLocaleString("ro-RO", { maximumFractionDigits: 2 })}{" "}
                  {report.currency}
                </span>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {n} {noun}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AdsCharts({ report }: { report: AdsReport }) {
  const daily = report.daily ?? [];
  const currency = report.currency;

  // Efficiency over time, computed here rather than charted raw: a day with
  // spend but no conversation has no cost per conversation, and drawing it as
  // zero would say the opposite of what happened.
  const spent = daily.reduce((s, d) => s + d.spend, 0);
  const conversations = daily.reduce((s, d) => s + d.connections, 0);
  const per90 = conversations > 0 ? spent / conversations : null;

  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("ro-RO", { day: "numeric", month: "short", year: "2-digit" });
  const dateRange = daily.length
    ? `${fmt(daily[0].date)} — ${fmt(daily[daily.length - 1].date)}`
    : "Tot istoricul";

  return (
    <div className="flex flex-col gap-px bg-border border border-border">
      <div className="bg-background">
        <DailyChart
          points={daily.map((d) => ({ date: d.date, value: d.spend }))}
          color={INDIGO}
          kind="area"
          format={(n) =>
            `${n.toLocaleString("ro-RO", { maximumFractionDigits: 0 })} ${currency}`
          }
          title="Cheltuit pe zi"
          subtitle={dateRange}
        />
      </div>
      <div className="bg-background">
        <DailyChart
          points={daily.map((d) => ({ date: d.date, value: d.connections }))}
          color={AMBER}
          kind="bars"
          format={(n) => `${n} conversații`}
          title="Conversații pe zi"
          subtitle={
            per90
              ? `Câte o conversație la ${per90.toLocaleString("ro-RO", { maximumFractionDigits: 2 })} ${currency}`
              : dateRange
          }
        />
      </div>
      <div className="bg-background">
        <DailyChart
          points={daily.map((d) => ({ date: d.date, value: d.leads }))}
          color={EMERALD}
          kind="bars"
          format={(n) => `${n} contacte`}
          title="Contacte pe zi"
          subtitle={dateRange}
        />
      </div>
      <div className="bg-background">
        <CostRanking
          report={report}
          title="Cât costă o conversație"
          noun="conversații"
          color={AMBER}
          cost={(a) => a.costPerConnection}
          count={(a) => a.connections}
          minimum={20}
        />
      </div>
      <div className="bg-background">
        <CostRanking
          report={report}
          title="Cât costă un contact"
          noun="contacte"
          color={EMERALD}
          cost={(a) => a.costPerLead}
          count={(a) => a.leads}
          minimum={10}
        />
      </div>
    </div>
  );
}
