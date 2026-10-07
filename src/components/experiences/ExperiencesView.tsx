"use client";

import { Award, BookOpen, Plus, Sparkles, Star, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { getDestination } from "@/data/destinations";
import { getProgram } from "@/data/programs";
import { getSchool } from "@/data/schools";
import { useT } from "@/i18n";
import { date, dateRange, uid } from "@/lib/format";
import { MOCK_TODAY } from "@/lib/mock-clock";
import { actions, useAppState } from "@/lib/store";
import type { Experience } from "@/lib/types";
import { VerificationBadge } from "../ui/badges";
import { EmptyState, PageHeader } from "../ui/misc";
import { Photo } from "../ui/Photo";

function Certificate({ exp, onClose }: { exp: Experience; onClose: () => void }) {
  const { t, lang } = useT();
  const c = exp.certificate!;
  const school = getSchool(getProgram(exp.programId)!.schoolId);
  return (
    <div role="dialog" aria-modal="true" aria-labelledby={`cert-${exp.id}`} className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={onClose}>
      <div className="relative w-full max-w-lg rounded-2xl border-8 border-double border-clay-100 bg-white p-8 text-center shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={onClose} className="absolute right-3 top-3 grid size-9 place-items-center rounded-full hover:bg-sand-100" aria-label={t("common.close")} autoFocus>
          <X aria-hidden className="size-5" />
        </button>
        <Award aria-hidden className="mx-auto size-12 text-clay-500" />
        <p className="mt-2 text-xs font-bold uppercase tracking-[0.2em] text-muted">{t("exp.certificate")}</p>
        <h2 id={`cert-${exp.id}`} className="h-display mt-2 text-2xl font-semibold">
          {c.title}
        </h2>
        <p className="mt-3 text-muted">{t("exp.issuedBy", { school: school?.name ?? c.issuedBy })}</p>
        <p className="mt-1 text-sm">
          {date(c.date, lang)} · {t("exp.hours", { n: c.hours })}
        </p>
      </div>
    </div>
  );
}

function ExperienceCard({ exp }: { exp: Experience }) {
  const { t, lang } = useT();
  const p = getProgram(exp.programId)!;
  const dest = getDestination(p.destinationId)!;
  const [showCert, setShowCert] = useState(false);
  const [entry, setEntry] = useState("");
  const [skill, setSkill] = useState("");
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState("");
  const update = (fn: (e: Experience) => Experience) => actions.updateExperience(exp.id, fn);

  return (
    <article className="card overflow-hidden">
      <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
        {exp.photos.map((ph, i) => (
          <Photo key={i} src={ph.src} alt={ph.alt} label={i === 0 ? dest.name : undefined} className={`aspect-[4/3] ${i === 0 ? "col-span-2 sm:col-span-2" : ""}`} />
        ))}
      </div>
      <div className="space-y-6 p-5">
        <header>
          <p className="text-sm font-semibold text-clay-700">{dateRange(exp.start, exp.end, lang)}</p>
          <h2 className="h-display text-2xl font-semibold">
            <Link href={`/programs/${p.id}`} className="hover:underline">
              {p.title[lang]}
            </Link>
          </h2>
          <p className="text-muted">
            {dest.name}, {dest.country[lang]}
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-2">
          <section aria-labelledby={`skills-${exp.id}`}>
            <h3 id={`skills-${exp.id}`} className="mb-2 font-bold">
              {t("exp.skills")}
            </h3>
            <ul className="flex flex-wrap gap-1.5">
              {exp.skills.map((s) => (
                <li key={s} className="rounded-full bg-lagoon-50 px-3 py-1 text-sm font-semibold text-lagoon-700">
                  {s}
                </li>
              ))}
            </ul>
            <form
              className="mt-2 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!skill.trim()) return;
                update((x) => ({ ...x, skills: [...new Set([...x.skills, skill.trim()])] }));
                setSkill("");
              }}
            >
              <label htmlFor={`skill-${exp.id}`} className="sr-only">
                {t("exp.addSkill")}
              </label>
              <input id={`skill-${exp.id}`} className="input py-2" placeholder={t("exp.addSkill")} value={skill} onChange={(e) => setSkill(e.target.value)} />
              <button type="submit" className="btn btn-secondary" aria-label={t("exp.addSkill")}>
                <Plus aria-hidden className="size-4" />
              </button>
            </form>
            {exp.certificate && (
              <button type="button" className="btn btn-secondary mt-4" onClick={() => setShowCert(true)}>
                <Award aria-hidden className="size-4" />
                {t("exp.viewCertificate")}
              </button>
            )}
          </section>

          <section aria-labelledby={`journal-${exp.id}`}>
            <h3 id={`journal-${exp.id}`} className="mb-2 flex items-center gap-2 font-bold">
              <BookOpen aria-hidden className="size-4" />
              {t("exp.journal")}
            </h3>
            <ol className="space-y-2 border-l-2 border-clay-100 pl-4">
              {exp.journal.map((j) => (
                <li key={j.id}>
                  <p className="text-xs font-semibold text-muted">{date(j.date, lang)}</p>
                  <p className="text-sm">{j.text}</p>
                </li>
              ))}
            </ol>
            <form
              className="mt-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (!entry.trim()) return;
                update((x) => ({ ...x, journal: [...x.journal, { id: uid("j"), date: MOCK_TODAY, text: entry.trim() }] }));
                setEntry("");
              }}
            >
              <label htmlFor={`entry-${exp.id}`} className="sr-only">
                {t("exp.addEntry")}
              </label>
              <textarea id={`entry-${exp.id}`} className="input min-h-20" placeholder={t("exp.entryPlaceholder")} value={entry} onChange={(e) => setEntry(e.target.value)} />
              <button type="submit" className="btn btn-secondary mt-2">
                <Plus aria-hidden className="size-4" />
                {t("exp.addEntry")}
              </button>
            </form>
          </section>
        </div>

        <section aria-labelledby={`review-${exp.id}`} className="rounded-2xl bg-sand-50 p-4">
          <h3 id={`review-${exp.id}`} className="flex flex-wrap items-center gap-2 font-bold">
            {exp.review ? t("exp.review") : t("exp.leaveReview")}
            <VerificationBadge status="verified" withTitle={false} />
          </h3>
          {exp.review ? (
            <div className="mt-2">
              <p className="text-amber-500" aria-label={`${exp.review.rating}/5`}>
                {"★".repeat(exp.review.rating)}
                <span className="text-line">{"★".repeat(5 - exp.review.rating)}</span>
              </p>
              <p className="mt-1">{exp.review.text}</p>
            </div>
          ) : (
            <form
              className="mt-2 space-y-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!review.trim()) return;
                update((x) => ({ ...x, review: { rating, text: review.trim(), date: MOCK_TODAY } }));
              }}
            >
              <p className="text-sm text-muted">{t("exp.reviewHelp")}</p>
              <fieldset className="flex items-center gap-1">
                <legend className="sr-only">{t("exp.rating")}</legend>
                {[1, 2, 3, 4, 5].map((n) => (
                  <label key={n} className="cursor-pointer">
                    <input type="radio" name={`rating-${exp.id}`} value={n} checked={rating === n} onChange={() => setRating(n)} className="peer sr-only" />
                    <Star aria-hidden className={`size-7 peer-focus-visible:outline-2 ${n <= rating ? "fill-amber-400 text-amber-500" : "text-line"}`} />
                    <span className="sr-only">{n}</span>
                  </label>
                ))}
              </fieldset>
              <label htmlFor={`review-text-${exp.id}`} className="sr-only">
                {t("exp.review")}
              </label>
              <textarea id={`review-text-${exp.id}`} className="input min-h-20" value={review} onChange={(e) => setReview(e.target.value)} />
              <button type="submit" className="btn btn-primary">
                {t("exp.submitReview")}
              </button>
            </form>
          )}
        </section>
      </div>
      {showCert && <Certificate exp={exp} onClose={() => setShowCert(false)} />}
    </article>
  );
}

export function ExperiencesView() {
  const { t } = useT();
  const experiences = useAppState((s) => s.experiences);
  const sorted = [...experiences].sort((a, b) => b.start.localeCompare(a.start));
  return (
    <>
      <PageHeader title={t("exp.title")} subtitle={t("exp.subtitle")}>
        <Link href="/chat?next=1" className="btn btn-primary">
          <Sparkles aria-hidden className="size-4" />
          {t("exp.planNext")}
        </Link>
      </PageHeader>
      <p className="-mt-3 mb-6 text-sm text-muted">{t("exp.planNextDesc")}</p>
      {sorted.length ? (
        <ol className="relative space-y-8 border-l-2 border-sand-200 pl-6 sm:pl-8">
          {sorted.map((e) => (
            <li key={e.id} className="relative">
              <span aria-hidden className="absolute -left-[33px] top-6 size-4 rounded-full border-4 border-sand-50 bg-clay-500 sm:-left-[41px]" />
              <ExperienceCard exp={e} />
            </li>
          ))}
        </ol>
      ) : (
        <EmptyState>{t("exp.empty")}</EmptyState>
      )}
    </>
  );
}
