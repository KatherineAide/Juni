"use client";

import { useId, useState } from "react";

/** Horizontal bars for one series (pass rate per check). Values are direct-labeled at the bar tip. */
export function RateBars({
  rows,
  formatValue,
}: {
  rows: { id: string; label: string; value: number; detail: string }[];
  formatValue: (v: number) => string;
}) {
  const [hover, setHover] = useState<string | null>(null);
  return (
    <ul className="space-y-3" role="list">
      {rows.map((r) => {
        const active = hover === r.id;
        return (
          <li key={r.id} className="grid grid-cols-[minmax(0,1fr)] gap-1 sm:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] sm:items-center sm:gap-4">
            <span className="text-sm text-ink">{r.label}</span>
            <div
              className="relative flex items-center gap-2 outline-none"
              tabIndex={0}
              aria-label={`${r.label}: ${formatValue(r.value)} (${r.detail})`}
              onPointerEnter={() => setHover(r.id)}
              onPointerLeave={() => setHover(null)}
              onFocus={() => setHover(r.id)}
              onBlur={() => setHover(null)}
            >
              <div className="relative h-3 flex-1 border-l border-grid">
                <div
                  className={`h-3 rounded-r-[4px] bg-chart-1 transition-opacity ${hover && !active ? "opacity-60" : ""}`}
                  style={{ width: `${Math.max(0, Math.min(1, r.value)) * 100}%` }}
                />
              </div>
              <span className="w-24 shrink-0 text-right text-sm font-semibold tabular-nums text-ink">{formatValue(r.value)}</span>
              {active && (
                <span role="tooltip" className="pointer-events-none absolute -top-9 left-0 z-10 whitespace-nowrap rounded-lg bg-ink px-2.5 py-1 text-xs text-white shadow">
                  <strong className="font-bold">{formatValue(r.value)}</strong> <span className="text-white/75">{r.detail}</span>
                </span>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** Single-series line over runs (0–100%), with a snapping crosshair tooltip and keyboard-focusable points. */
export function TrendLine({
  points,
  formatValue,
  ariaLabel,
}: {
  points: { key: string; label: string; value: number }[];
  formatValue: (v: number) => string;
  ariaLabel: string;
}) {
  const id = useId();
  const [active, setActive] = useState<number | null>(null);
  // Small viewBox so the SVG's text renders near its nominal size in a half-width card.
  const W = 440;
  const H = 200;
  const pad = { l: 40, r: 48, t: 14, b: 30 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const x = (i: number) => pad.l + (points.length === 1 ? iw / 2 : (i / (points.length - 1)) * iw);
  const y = (v: number) => pad.t + (1 - v) * ih;
  const path = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  const last = points.length - 1;

  const onMove = (e: React.PointerEvent<SVGRectElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * iw;
    const i = points.length === 1 ? 0 : Math.round((px / iw) * (points.length - 1));
    setActive(Math.max(0, Math.min(points.length - 1, i)));
  };

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-labelledby={`${id}-t`}>
        <title id={`${id}-t`}>{ariaLabel}</title>
        {[0, 0.5, 1].map((g) => (
          <g key={g}>
            <line x1={pad.l} x2={W - pad.r} y1={y(g)} y2={y(g)} stroke="var(--color-grid)" strokeWidth={1} />
            <text x={pad.l - 8} y={y(g)} dy="0.32em" textAnchor="end" className="fill-muted text-[12px] tabular-nums">
              {Math.round(g * 100)}%
            </text>
          </g>
        ))}
        {points.map((p, i) =>
          i === 0 || i === last || points.length <= 6 ? (
            <text key={p.key} x={x(i)} y={H - 8} textAnchor={i === 0 && points.length > 1 ? "start" : i === last && points.length > 1 ? "end" : "middle"} className="fill-muted text-[11px]">
              {p.label}
            </text>
          ) : null,
        )}
        <path d={path} fill="none" stroke="var(--color-chart-1)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {active !== null && <line x1={x(active)} x2={x(active)} y1={pad.t} y2={pad.t + ih} stroke="var(--color-muted)" strokeWidth={1} />}
        {points.map((p, i) => (
          <circle
            key={p.key}
            cx={x(i)}
            cy={y(p.value)}
            r={active === i ? 6 : 4}
            fill="var(--color-chart-1)"
            stroke="#fff"
            strokeWidth={2}
            tabIndex={0}
            aria-label={`${p.label}: ${formatValue(p.value)}`}
            onFocus={() => setActive(i)}
            onBlur={() => setActive(null)}
            className="outline-none"
          />
        ))}
        <text x={x(last) + 10} y={y(points[last].value)} dy="0.32em" className="fill-ink text-[13px] font-semibold">
          {formatValue(points[last].value)}
        </text>
        <rect x={pad.l} y={pad.t} width={iw} height={ih} fill="transparent" onPointerMove={onMove} onPointerLeave={() => setActive(null)} />
      </svg>
      {active !== null && (
        <div
          role="tooltip"
          className="pointer-events-none absolute top-2 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg bg-ink px-2.5 py-1.5 text-xs text-white shadow"
          style={{ left: `${(x(active) / W) * 100}%` }}
        >
          <strong className="block text-sm font-bold">{formatValue(points[active].value)}</strong>
          <span className="text-white/75">{points[active].label}</span>
        </div>
      )}
    </div>
  );
}
