"use client";

import { Award, CalendarDays, Clock, Columns3, Languages, MapPin } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { getDestination } from "@/data/destinations";
import { getSchool } from "@/data/schools";
import { useT } from "@/i18n";
import { nextSession } from "@/lib/fit";
import { date, money } from "@/lib/format";
import { actions, useAppState } from "@/lib/store";
import type { FitResult, Program } from "@/lib/types";
import { FitBadge, Rating, VerificationBadge } from "../ui/badges";
import { HeartButton } from "../ui/misc";
import { Photo } from "../ui/Photo";

export function ProgramCard({ program: p, fit, compact = false }: { program: Program; fit?: FitResult; compact?: boolean }) {
  const { t, lang } = useT();
  const saved = useAppState((s) => s.savedPrograms.includes(p.id));
  const inCompare = useAppState((s) => s.compare.includes(p.id));
  const [full, setFull] = useState(false);
  const school = getSchool(p.schoolId)!;
  const dest = getDestination(p.destinationId)!;
  const session = fit?.sessionId ? p.sessions.find((s) => s.id === fit.sessionId) : nextSession(p);
  const weeks = p.weeks.min === p.weeks.max ? (p.weeks.min === 1 ? t("common.week") : t("common.weeks", { n: p.weeks.min })) : t("common.weeksRange", { min: p.weeks.min, max: p.weeks.max });
  const risky = school.verification.status === "risk";

  return (
    <article className={`card group relative flex flex-col overflow-hidden ${risky ? "border-red-200" : ""}`}>
      <div className="relative">
        <Photo src={p.image} alt={p.imageAlt[lang]} label={dest.name} className={compact ? "aspect-[16/9]" : "aspect-[4/3]"} />
        <div className="absolute left-3 top-3 z-10 flex flex-wrap gap-1.5">
          <VerificationBadge status={school.verification.status} />
          {p.sponsored && <span className="rounded-full bg-white px-2 py-1 text-xs font-bold text-ink">{t("common.sponsored")}</span>}
        </div>
        <HeartButton saved={saved} onToggle={() => actions.toggleSavedProgram(p.id)} name={p.title[lang]} className="absolute right-3 top-3 z-10" />
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        {fit && <FitBadge status={fit.status} className="self-start" />}
        <h3 className="text-lg font-bold leading-snug">
          <Link href={`/programs/${p.id}`} className="after:absolute after:inset-0 after:content-[''] hover:underline">
            {p.title[lang]}
          </Link>
        </h3>
        <p className="flex items-center gap-1 text-sm text-muted">
          <MapPin aria-hidden className="size-4 shrink-0" />
          <span>
            {school.name} · {dest.name}, {dest.country[lang]}
          </span>
        </p>
        <ul className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm text-ink">
          <li className="flex items-center gap-1.5">
            <Clock aria-hidden className="size-4 text-muted" />
            {weeks}
          </li>
          <li className="flex items-center gap-1.5">
            <Languages aria-hidden className="size-4 text-muted" />
            {p.instructionLanguages.join(" / ")}
          </li>
          <li className="flex items-center gap-1.5">
            <CalendarDays aria-hidden className="size-4 text-muted" />
            {session ? date(session.start, lang, { day: "numeric", month: "short", year: "numeric" }) : t("common.noSessions")}
          </li>
          <li className="flex items-center gap-1.5">
            <Award aria-hidden className="size-4 text-muted" />
            {t(`common.level.${p.level}`)}
            {p.certificate && <span className="sr-only">, {t("common.certificate")}</span>}
          </li>
        </ul>
        {fit && (
          <div className="relative z-10 mt-1 rounded-xl bg-sand-50 p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-muted">{fit.status === "none" ? t("fit.whyNot") : t("fit.why")}</p>
            <ul className="mt-1 space-y-1 text-sm">
              {(full ? fit.reasons : fit.reasons.slice(0, 3)).map((r, i) => (
                <li key={i} className="flex gap-1.5">
                  <span aria-hidden className={r.ok === true ? "text-fit-strong" : r.ok === "partial" ? "text-fit-partial" : "text-fit-none"}>
                    {r.ok === true ? "✓" : r.ok === "partial" ? "~" : "✕"}
                  </span>
                  <span>{r.text[lang]}</span>
                </li>
              ))}
            </ul>
            {fit.reasons.length > 3 && (
              <button type="button" onClick={() => setFull((v) => !v)} className="mt-1 text-xs font-semibold text-lagoon-700 underline">
                {full ? "−" : `+${fit.reasons.length - 3}`}
              </button>
            )}
          </div>
        )}
        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <div>
            <p className="text-lg font-bold">
              {money(p.pricePerWeek, lang)}
              <span className="text-sm font-medium text-muted">{t("common.perWeek")}</span>
            </p>
            <p className="text-xs text-muted">{t("common.checkedShort", { date: date(p.priceLastChecked, lang, { day: "numeric", month: "short" }) })}</p>
          </div>
          <Rating rating={p.rating} count={p.reviewCount} />
        </div>
        {!compact && (
          <button
            type="button"
            onClick={() => {
              if (!actions.toggleCompare(p.id)) alert(t("prog.compareFull"));
            }}
            aria-pressed={inCompare}
            className={`relative z-10 mt-1 inline-flex items-center justify-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold ${inCompare ? "border-lagoon-600 bg-lagoon-50 text-lagoon-700" : "border-line text-ink hover:bg-sand-100"}`}
          >
            <Columns3 aria-hidden className="size-4" />
            {inCompare ? t("common.inCompare") : t("common.compare")}
          </button>
        )}
      </div>
    </article>
  );
}
