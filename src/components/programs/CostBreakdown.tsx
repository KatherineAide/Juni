"use client";

import { useState } from "react";
import { getDestination } from "@/data/destinations";
import { useT } from "@/i18n";
import { defaultHousing, defaultWeeks, estimateTrip } from "@/lib/estimate";
import { money } from "@/lib/format";
import { useAppState } from "@/lib/store";
import type { HousingType, Program } from "@/lib/types";
import { SourceNote } from "../ui/misc";

/** Interactive total trip cost estimate (course + housing + living). */
export function CostBreakdown({
  program: p,
  initialWeeks,
  initialHousing,
  interactive = true,
}: {
  program: Program;
  initialWeeks?: number;
  initialHousing?: HousingType;
  interactive?: boolean;
}) {
  const { t, lang } = useT();
  const prefs = useAppState((s) => s.profile.housing);
  const [weeks, setWeeks] = useState(defaultWeeks(p, initialWeeks));
  const [housing, setHousing] = useState<HousingType>(initialHousing ?? defaultHousing(p, prefs));
  const est = estimateTrip(p, weeks, housing);
  const dest = getDestination(p.destinationId)!;
  const weekOptions = Array.from({ length: p.weeks.max - p.weeks.min + 1 }, (_, i) => p.weeks.min + i);
  const local = new Intl.NumberFormat(lang === "es" ? "es-ES" : "en-US", { style: "currency", currency: dest.currency.code, maximumFractionDigits: 0 }).format(est.total * dest.currency.perUsd);

  const rows: [string, number][] = [
    [`${t("prog.est.tuition")} (${money(p.pricePerWeek, lang)} × ${weeks})`, est.tuition],
    [t("prog.est.registration"), est.registration],
    [`${t("prog.est.housingCost")} · ${t(`common.housing.${est.housingType}`)}`, est.housing],
    [t("prog.est.living"), est.living],
  ];

  return (
    <div>
      {interactive && (
        <div className="mb-4 grid grid-cols-2 gap-3">
          <label className="block">
            <span className="label">{t("prog.est.weeks")}</span>
            <select className="input" value={weeks} onChange={(e) => setWeeks(Number(e.target.value))} disabled={weekOptions.length === 1}>
              {weekOptions.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="label">{t("prog.est.housing")}</span>
            <select className="input" value={housing} onChange={(e) => setHousing(e.target.value as HousingType)}>
              {p.housing.map((h) => (
                <option key={h.type} value={h.type}>
                  {t(`common.housing.${h.type}`)} {h.pricePerWeek ? `· ${money(h.pricePerWeek, lang)}${t("common.perWeek")}` : ""}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
      <dl className="divide-y divide-line text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4 py-2">
            <dt className="text-muted">{label}</dt>
            <dd className="font-semibold tabular-nums">{money(value, lang)}</dd>
          </div>
        ))}
        <div className="flex justify-between gap-4 py-3 text-base">
          <dt className="font-bold">{t("prog.est.total")}</dt>
          <dd className="font-bold tabular-nums">{money(est.total, lang)}</dd>
        </div>
      </dl>
      <p className="text-xs text-muted">{t("prog.est.local", { amount: local })}</p>
      <p className="mt-1 text-xs text-muted">{t("prog.estimateNote", { city: dest.name })}</p>
      <SourceNote source={p.priceSource} checked={p.priceLastChecked} className="mt-1" />
      <SourceNote source={dest.currency.source} checked={dest.currency.lastChecked} />
    </div>
  );
}
