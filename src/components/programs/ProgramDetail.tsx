"use client";

import { AlertTriangle, ArrowLeft, Award, CalendarClock, Clock, Columns3, Languages, Mail, MapPin, MessageCircleHeart, Plus, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getCategory } from "@/data/categories";
import { getDestination } from "@/data/destinations";
import { reviewsFor } from "@/data/reviews";
import { getSchool } from "@/data/schools";
import { useT } from "@/i18n";
import { evaluateProgram, upcomingSessions } from "@/lib/fit";
import { addDays, date, dateRange, money } from "@/lib/format";
import { actions, useAppState } from "@/lib/store";
import type { Program } from "@/lib/types";
import { FitBadge, Rating, RiskFlagPill, VerificationBadge } from "../ui/badges";
import { HeartButton, SectionTitle } from "../ui/misc";
import { Photo } from "../ui/Photo";
import { CostBreakdown } from "./CostBreakdown";
import { VerificationPanel } from "./VerificationPanel";

export function ProgramDetail({ program: p }: { program: Program }) {
  const { t, lang } = useT();
  const router = useRouter();
  const profile = useAppState((s) => s.profile);
  const saved = useAppState((s) => s.savedPrograms.includes(p.id));
  const inCompare = useAppState((s) => s.compare.includes(p.id));
  const inTrips = useAppState((s) => s.trips.some((tr) => tr.programId === p.id && tr.status !== "completed"));
  const school = getSchool(p.schoolId)!;
  const dest = getDestination(p.destinationId)!;
  const cat = getCategory(p.category);
  const fit = evaluateProgram(p, { budget: profile.budgetMax, passport: profile.passport || undefined }, profile);
  const sessions = upcomingSessions(p);
  const reviews = reviewsFor(p.id);
  const risky = school.verification.status === "risk";

  return (
    <article>
      <Link href="/programs" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-ink">
        <ArrowLeft aria-hidden className="size-4" />
        {t("common.back")}
      </Link>

      <div className="relative overflow-hidden rounded-[var(--radius-card)]">
        <Photo src={p.image} alt={p.imageAlt[lang]} priority className="aspect-[16/9] max-h-[440px] w-full sm:aspect-[21/9]" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-8">
          <div className="mb-2 flex flex-wrap gap-2">
            <VerificationBadge status={school.verification.status} />
            <span className="rounded-full bg-white/90 px-2.5 py-1 text-xs font-bold text-ink">{cat.name[lang]}</span>
          </div>
          <h1 className="h-display text-3xl font-semibold leading-tight sm:text-5xl">{p.title[lang]}</h1>
          <p className="mt-2 flex items-center gap-1.5 text-white/90">
            <MapPin aria-hidden className="size-4" />
            {school.name} · {dest.name}, {dest.country[lang]}
          </p>
        </div>
        <HeartButton saved={saved} onToggle={() => actions.toggleSavedProgram(p.id)} name={p.title[lang]} className="absolute right-4 top-4" />
      </div>

      {risky && (
        <div role="alert" className="mt-5 flex gap-3 rounded-2xl border border-red-200 bg-fit-none-bg p-4 text-fit-none">
          <AlertTriangle aria-hidden className="mt-0.5 size-5 shrink-0" />
          <div>
            <p className="font-bold">{t("prog.riskWarning")}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {fit.riskFlags.map((f) => (
                <RiskFlagPill key={f.en}>{f[lang]}</RiskFlagPill>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-8">
          <section aria-labelledby="facts">
            <h2 id="facts" className="sr-only">
              {t("prog.facts")}
            </h2>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { Icon: Clock, label: t("common.weeksRange", { min: p.weeks.min, max: p.weeks.max }) },
                { Icon: CalendarClock, label: t("common.hoursPerWeek", { n: p.hoursPerWeek }) },
                { Icon: Languages, label: p.instructionLanguages.join(" / ") },
                { Icon: Award, label: `${t(`common.level.${p.level}`)}${p.certificate ? ` · ${t("common.certificate")}` : ""}` },
              ].map(({ Icon, label }) => (
                <li key={label} className="card flex items-center gap-2 p-3 text-sm font-semibold">
                  <Icon aria-hidden className="size-5 shrink-0 text-clay-600" />
                  {label}
                </li>
              ))}
            </ul>
            <p className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted">
              <Rating rating={p.rating} count={p.reviewCount} />
              <span className="inline-flex items-center gap-1">
                <Users aria-hidden className="size-4" />
                {t("prog.minAge", { n: p.minAge })}
              </span>
              {p.accessibility.map((a) => (
                <span key={a} className="rounded-full bg-lagoon-50 px-2 py-0.5 text-xs font-semibold text-lagoon-700">
                  {t(`common.access.${a}`)}
                </span>
              ))}
            </p>
          </section>

          <section aria-labelledby="about">
            <SectionTitle id="about">{t("prog.description")}</SectionTitle>
            <p className="text-lg leading-relaxed">{p.summary[lang]}</p>
            <p className="mt-3 leading-relaxed text-muted">{p.description[lang]}</p>
          </section>

          <div className="grid gap-6 sm:grid-cols-2">
            <section aria-labelledby="schedule" className="card p-5">
              <h2 id="schedule" className="mb-3 font-bold">
                {t("prog.schedule")}
              </h2>
              <ul className="space-y-2 text-sm">
                {p.schedule.map((s) => (
                  <li key={s.en} className="flex gap-2">
                    <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-clay-500" />
                    {s[lang]}
                  </li>
                ))}
              </ul>
            </section>
            <section aria-labelledby="includes" className="card p-5">
              <h2 id="includes" className="mb-3 font-bold">
                {t("prog.includes")}
              </h2>
              <ul className="space-y-2 text-sm">
                {p.includes.map((s) => (
                  <li key={s.en} className="flex gap-2">
                    <span aria-hidden className="text-fit-strong">
                      ✓
                    </span>
                    {s[lang]}
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <section aria-labelledby="housing">
            <SectionTitle id="housing">{t("prog.housing")}</SectionTitle>
            <ul className="grid gap-3 sm:grid-cols-2">
              {p.housing.map((h) => (
                <li key={h.type} className="card p-4">
                  <p className="font-bold">{t(`common.housing.${h.type}`)}</p>
                  {h.pricePerWeek > 0 && (
                    <p className="text-sm">
                      {money(h.pricePerWeek, lang)}
                      {t("common.perWeek")}
                    </p>
                  )}
                  {h.note && <p className="mt-1 text-sm text-muted">{h.note[lang]}</p>}
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="sessions">
            <SectionTitle id="sessions">{t("prog.sessions")}</SectionTitle>
            <ul className="divide-y divide-line rounded-2xl border border-line bg-white">
              {sessions.length === 0 && <li className="p-4 text-muted">{t("common.noSessions")}</li>}
              {sessions.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 p-4 text-sm">
                  <span className="font-semibold">{dateRange(s.start, s.end, lang)}</span>
                  <span className="text-muted">{t("common.deadline", { date: date(addDays(s.start, -p.applicationDeadlineDays), lang) })}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${s.seatsLeft <= 3 ? "bg-fit-partial-bg text-fit-partial" : "bg-sand-100 text-muted"}`}>
                    {t("common.seatsLeft", { n: s.seatsLeft })}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-muted">
              {t("prog.deadline")}: {t("prog.deadlineNote", { days: p.applicationDeadlineDays })}
            </p>
          </section>

          <section aria-labelledby="reviews">
            <SectionTitle id="reviews">{t("prog.reviews")}</SectionTitle>
            {reviews.length === 0 && <p className="text-muted">{t("common.noReviews")}</p>}
            <ul className="space-y-3">
              {reviews.map((r) => (
                <li key={r.id} className="card p-4">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-bold">{r.author}</span>
                    <span className="text-muted">· {r.homeCountry}</span>
                    <span aria-label={`${r.rating}/5`} className="text-amber-500">
                      {"★".repeat(r.rating)}
                      <span className="text-line">{"★".repeat(5 - r.rating)}</span>
                    </span>
                    {r.verifiedParticipant ? (
                      <VerificationBadge status="verified" withTitle={false} className="!py-0.5" />
                    ) : (
                      <span className="rounded-full bg-fit-none-bg px-2 py-0.5 text-xs font-bold text-fit-none">{t("prog.unverifiedReview")}</span>
                    )}
                    <span className="ml-auto text-xs text-muted">{date(r.date, lang)}</span>
                  </div>
                  <p className="mt-2" lang={r.lang}>
                    {r.text}
                  </p>
                  {r.lang !== lang && <p className="mt-1 text-xs text-muted">{t("prog.writtenIn", { lang: r.lang === "es" ? (lang === "es" ? "español" : "Spanish") : lang === "es" ? "inglés" : "English" })}</p>}
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="space-y-5">
          <div className="card p-5 lg:sticky lg:top-6">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm text-muted">{t("common.from")}</p>
                <p className="text-2xl font-bold">
                  {money(p.pricePerWeek, lang)}
                  <span className="text-base font-medium text-muted">{t("common.perWeek")}</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold uppercase tracking-wide text-muted">{t("fit.yourFit")}</p>
                <FitBadge status={fit.status} />
              </div>
            </div>
            <p className="mt-1 text-xs text-muted">{t("fit.basedOnProfile", { budget: money(profile.budgetMax, lang) })}</p>
            <ul className="mt-3 space-y-1 text-sm">
              {fit.reasons.slice(0, 4).map((r, i) => (
                <li key={i} className="flex gap-1.5">
                  <span aria-hidden className={r.ok === true ? "text-fit-strong" : r.ok === "partial" ? "text-fit-partial" : "text-fit-none"}>
                    {r.ok === true ? "✓" : r.ok === "partial" ? "~" : "✕"}
                  </span>
                  {r.text[lang]}
                </li>
              ))}
            </ul>
            <div className="mt-4 grid gap-2">
              <Link href={`/chat?program=${p.id}`} className="btn btn-primary">
                <MessageCircleHeart aria-hidden className="size-4" />
                {t("common.askJuni")}
              </Link>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={risky}
                  onClick={() => {
                    const id = actions.addTrip(p.id);
                    router.push(`/trips?trip=${id}`);
                  }}
                >
                  <Plus aria-hidden className="size-4" />
                  {inTrips ? t("common.inTrips") : t("common.addToTrips")}
                </button>
                <button
                  type="button"
                  className={`btn ${inCompare ? "btn-teal" : "btn-secondary"}`}
                  aria-pressed={inCompare}
                  onClick={() => {
                    if (!actions.toggleCompare(p.id)) alert(t("prog.compareFull"));
                  }}
                >
                  <Columns3 aria-hidden className="size-4" />
                  {inCompare ? t("common.inCompare") : t("common.compare")}
                </button>
              </div>
            </div>
          </div>

          <section aria-labelledby="estimate" className="card p-5">
            <h2 id="estimate" className="mb-3 font-bold">
              {t("prog.estimate")}
            </h2>
            <CostBreakdown program={p} />
          </section>

          <section aria-labelledby="verification" className="card p-5">
            <h2 id="verification" className="mb-3 font-bold">
              {t("verify.details")}
            </h2>
            <VerificationPanel record={school.verification} schoolName={school.name} />
          </section>

          <section aria-labelledby="school" className="card p-5 text-sm">
            <h2 id="school" className="mb-2 font-bold">
              {t("prog.school")}
            </h2>
            <p className="font-semibold">{school.name}</p>
            <p className="text-muted">{school.address ?? t("dest.noAddress")}</p>
            <p className="mt-2 flex items-center gap-1.5 text-muted">
              <Mail aria-hidden className="size-4" />
              {school.email}
            </p>
            <Link href={`/destinations/${dest.id}`} className="mt-3 inline-block font-semibold text-lagoon-700 underline">
              {dest.name}, {dest.country[lang]} →
            </Link>
          </section>
        </aside>
      </div>
    </article>
  );
}
