"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { getDestination } from "@/data/destinations";
import { getProgram } from "@/data/programs";
import { getSchool } from "@/data/schools";
import { useT } from "@/i18n";
import { estimateTrip, defaultHousing } from "@/lib/estimate";
import { nextSession } from "@/lib/fit";
import { date, money } from "@/lib/format";
import { useAppState } from "@/lib/store";
import type { FitResult } from "@/lib/types";
import { FitBadge, VerificationBadge } from "../ui/badges";
import { Photo } from "../ui/Photo";

export function CompareTable({ ids, fits, onRemove }: { ids: string[]; fits?: FitResult[]; onRemove?: (id: string) => void }) {
  const { t, lang } = useT();
  const housingPrefs = useAppState((s) => s.profile.housing);
  const list = ids.map(getProgram).filter((p) => !!p);

  const rows: { label: string; cell: (i: number) => React.ReactNode }[] = [
    ...(fits ? [{ label: t("prog.row.fit"), cell: (i: number) => <FitBadge status={fits[i].status} /> }] : []),
    { label: t("prog.row.verification"), cell: (i) => <VerificationBadge status={getSchool(list[i].schoolId)!.verification.status} /> },
    { label: t("prog.row.price"), cell: (i) => `${money(list[i].pricePerWeek, lang)}${t("common.perWeek")}` },
    {
      label: fits ? t("prog.est.total") : t("prog.row.total"),
      cell: (i) => {
        const p = list[i];
        const est = fits ? fits[i].estimate : estimateTrip(p, Math.min(p.weeks.max, Math.max(p.weeks.min, 2)), defaultHousing(p, housingPrefs));
        return (
          <span>
            <strong>{money(est.total, lang)}</strong>
            <span className="block text-xs text-muted">{t("common.weeks", { n: est.weeks })}</span>
          </span>
        );
      },
    },
    { label: t("prog.row.duration"), cell: (i) => t("common.weeksRange", { min: list[i].weeks.min, max: list[i].weeks.max }) },
    { label: t("prog.row.intensity"), cell: (i) => t("common.hoursPerWeek", { n: list[i].hoursPerWeek }) },
    { label: t("prog.row.level"), cell: (i) => t(`common.level.${list[i].level}`) },
    { label: t("prog.row.language"), cell: (i) => list[i].instructionLanguages.join(", ") },
    { label: t("prog.row.housing"), cell: (i) => list[i].housing.map((h) => t(`common.housing.${h.type}`)).join(", ") },
    {
      label: t("prog.row.next"),
      cell: (i) => {
        const s = fits?.[i].sessionId ? list[i].sessions.find((x) => x.id === fits[i].sessionId) : nextSession(list[i]);
        return s ? date(s.start, lang) : "—";
      },
    },
    { label: t("prog.row.certificate"), cell: (i) => (list[i].certificate ? t("prog.yes") : t("prog.no")) },
    { label: t("prog.row.rating"), cell: (i) => (list[i].rating ? `★ ${list[i].rating!.toFixed(1)} (${list[i].reviewCount})` : "—") },
  ];

  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-white">
      <table className="w-full min-w-[560px] border-collapse text-sm">
        <caption className="sr-only">{t("prog.compareTitle")}</caption>
        <thead>
          <tr>
            <td className="w-32 p-3" />
            {list.map((p) => {
              const d = getDestination(p.destinationId)!;
              return (
                <th key={p.id} scope="col" className="p-3 text-left align-top font-normal">
                  <Photo src={p.image} alt={p.imageAlt[lang]} label={d.name} className="mb-2 aspect-[16/9] rounded-xl" />
                  <Link href={`/programs/${p.id}`} className="font-bold leading-snug hover:underline">
                    {p.title[lang]}
                  </Link>
                  <p className="text-xs text-muted">
                    {d.name}, {d.country[lang]}
                  </p>
                  {onRemove && (
                    <button type="button" onClick={() => onRemove(p.id)} className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-muted hover:text-ink">
                      <X aria-hidden className="size-3" />
                      {t("prog.remove")}
                    </button>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className="border-t border-line">
              <th scope="row" className="p-3 text-left text-xs font-bold uppercase tracking-wide text-muted">
                {r.label}
              </th>
              {list.map((p, i) => (
                <td key={p.id} className="p-3 align-top">
                  {r.cell(i)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
