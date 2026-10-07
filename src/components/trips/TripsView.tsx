"use client";

import { ArrowLeft, Bell, CalendarClock, CheckCircle2, Mail, MessageCircleHeart, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { getDestination } from "@/data/destinations";
import { getProgram } from "@/data/programs";
import { getSchool } from "@/data/schools";
import { useT } from "@/i18n";
import { addDays, date, dateRange, daysBetween, loc, money, uid } from "@/lib/format";
import { MOCK_TODAY } from "@/lib/mock-clock";
import { actions, useAppState } from "@/lib/store";
import type { ChecklistItem, Trip, TripStatus } from "@/lib/types";
import { DraftCard } from "../chat/ChatParts";
import { VerificationBadge } from "../ui/badges";
import { EmptyState, PageHeader } from "../ui/misc";
import { Photo } from "../ui/Photo";

const STATUSES: TripStatus[] = ["saved", "planning", "applied", "enrolled", "completed"];
const GROUPS: ChecklistItem["group"][] = ["documents", "visa", "insurance", "payments", "packing"];

function StatusPipeline({ status }: { status: TripStatus }) {
  const { t } = useT();
  const idx = STATUSES.indexOf(status);
  return (
    <ol className="flex items-center gap-1" aria-label={t(`trips.status.${status}`)}>
      {STATUSES.map((s, i) => (
        <li key={s} className="flex flex-1 flex-col gap-1">
          <span className={`h-1.5 rounded-full ${i <= idx ? "bg-clay-500" : "bg-sand-200"}`} />
          <span className={`hidden text-[11px] font-semibold sm:block ${i === idx ? "text-clay-700" : "text-muted"}`}>{t(`trips.status.${s}`)}</span>
        </li>
      ))}
    </ol>
  );
}

function tripInfo(trip: Trip) {
  const p = getProgram(trip.programId)!;
  const session = p.sessions.find((s) => s.id === trip.sessionId) ?? p.sessions[0];
  const days = daysBetween(MOCK_TODAY, session.start);
  return { p, session, days, dest: getDestination(p.destinationId)!, school: getSchool(p.schoolId)! };
}

function TripCard({ trip }: { trip: Trip }) {
  const { t, lang } = useT();
  const { p, session, days, dest } = tripInfo(trip);
  return (
    <article className="card relative flex gap-4 overflow-hidden p-3">
      <Photo src={p.image} alt={p.imageAlt[lang]} label={dest.name} className="aspect-square w-24 shrink-0 rounded-xl sm:w-32" />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className="self-start rounded-full bg-sand-100 px-2 py-0.5 text-xs font-bold text-muted">{t(`trips.status.${trip.status}`)}</span>
        <h3 className="font-bold leading-snug">
          <Link href={`/trips?trip=${trip.id}`} className="after:absolute after:inset-0 after:content-[''] hover:underline">
            {p.title[lang]}
          </Link>
        </h3>
        <p className="text-sm text-muted">
          {dest.name} · {dateRange(session.start, session.end, lang)}
        </p>
        {trip.status !== "completed" && (
          <p className="text-sm font-bold text-clay-700">{days > 0 ? t("trips.countdown", { n: days }) : t("trips.started")}</p>
        )}
        <div className="mt-auto pt-1">
          <StatusPipeline status={trip.status} />
        </div>
      </div>
    </article>
  );
}

function TripDetail({ trip }: { trip: Trip }) {
  const { t, lang } = useT();
  const router = useRouter();
  const { p, session, days, dest, school } = tripInfo(trip);
  const [newItem, setNewItem] = useState("");
  const [newGroup, setNewGroup] = useState<ChecklistItem["group"]>("documents");
  const appDeadline = addDays(session.start, -p.applicationDeadlineDays);
  const dueItems = trip.checklist.filter((c) => c.due && !c.done).sort((a, b) => a.due!.localeCompare(b.due!));
  const plannedTotal = trip.budget.reduce((s, b) => s + b.planned, 0);
  const actualTotal = trip.budget.reduce((s, b) => s + (b.actual ?? 0), 0);
  const doneCount = trip.checklist.filter((c) => c.done).length;
  const update = (fn: (t: Trip) => Trip) => actions.updateTrip(trip.id, fn);

  return (
    <article>
      <Link href="/trips" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-ink">
        <ArrowLeft aria-hidden className="size-4" />
        {t("trips.title")}
      </Link>
      <div className="relative overflow-hidden rounded-[var(--radius-card)]">
        <Photo src={p.image} alt={p.imageAlt[lang]} className="aspect-[21/9] max-h-72 w-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-3 p-5 text-white">
          <div>
            <h1 className="h-display text-2xl font-semibold sm:text-4xl">{p.title[lang]}</h1>
            <p className="text-white/90">
              {school.name} · {dest.name} · {dateRange(session.start, session.end, lang)}
            </p>
          </div>
          {trip.status !== "completed" && (
            <div className="rounded-2xl bg-white/95 px-4 py-2 text-center text-ink">
              <p className="text-3xl font-bold tabular-nums">{Math.max(0, days)}</p>
              <p className="text-xs font-semibold text-muted">{days > 0 ? t("trips.daysToGo") : t("trips.started")}</p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <div className="min-w-64 flex-1">
          <StatusPipeline status={trip.status} />
        </div>
        <label className="flex items-center gap-2 text-sm font-semibold">
          {t("trips.moveTo")}
          <select className="input w-auto py-2" value={trip.status} onChange={(e) => update((x) => ({ ...x, status: e.target.value as TripStatus }))}>
            {STATUSES.filter((s) => s !== "completed").map((s) => (
              <option key={s} value={s}>
                {t(`trips.status.${s}`)}
              </option>
            ))}
            {trip.status === "completed" && <option value="completed">{t("trips.status.completed")}</option>}
          </select>
        </label>
        {trip.status !== "completed" && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              actions.completeTrip(trip.id);
              router.push("/experiences");
            }}
          >
            <CheckCircle2 aria-hidden className="size-4" />
            {t("trips.markCompleted")}
          </button>
        )}
        <button
          type="button"
          className="btn btn-ghost text-fit-none"
          onClick={() => {
            actions.removeTrip(trip.id);
            router.push("/trips");
          }}
        >
          <Trash2 aria-hidden className="size-4" />
          {t("trips.remove")}
        </button>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <section aria-labelledby="checklist" className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 id="checklist" className="text-lg font-bold">
                {t("trips.checklist")}
              </h2>
              <span className="text-sm font-semibold text-muted">
                {doneCount}/{trip.checklist.length}
              </span>
            </div>
            <div className="space-y-4">
              {GROUPS.map((g) => {
                const items = trip.checklist.filter((c) => c.group === g);
                if (!items.length) return null;
                return (
                  <fieldset key={g}>
                    <legend className="mb-1 text-xs font-bold uppercase tracking-wide text-muted">{t(`trips.group.${g}`)}</legend>
                    <ul className="space-y-1">
                      {items.map((c) => (
                        <li key={c.id} className="flex items-start gap-3 rounded-lg px-1 py-1 hover:bg-sand-50">
                          <input
                            id={c.id}
                            type="checkbox"
                            className="mt-1 size-4 accent-clay-600"
                            checked={c.done}
                            onChange={(e) => update((x) => ({ ...x, checklist: x.checklist.map((i) => (i.id === c.id ? { ...i, done: e.target.checked } : i)) }))}
                          />
                          <label htmlFor={c.id} className={`flex-1 text-sm ${c.done ? "text-muted line-through" : ""}`}>
                            {loc(c.label, lang)}
                            {c.due && <span className="ml-2 text-xs font-semibold text-clay-700 no-underline">{t("trips.due", { date: date(c.due, lang) })}</span>}
                          </label>
                        </li>
                      ))}
                    </ul>
                  </fieldset>
                );
              })}
            </div>
            <form
              className="mt-4 flex flex-wrap gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!newItem.trim()) return;
                update((x) => ({ ...x, checklist: [...x.checklist, { id: uid("c"), group: newGroup, label: newItem.trim(), done: false }] }));
                setNewItem("");
              }}
            >
              <label className="sr-only" htmlFor="new-item">
                {t("trips.addItem")}
              </label>
              <input id="new-item" className="input flex-1" placeholder={t("trips.addItem")} value={newItem} onChange={(e) => setNewItem(e.target.value)} />
              <select className="input w-auto" value={newGroup} onChange={(e) => setNewGroup(e.target.value as ChecklistItem["group"])} aria-label={t("prog.f.category")}>
                {GROUPS.map((g) => (
                  <option key={g} value={g}>
                    {t(`trips.group.${g}`)}
                  </option>
                ))}
              </select>
              <button type="submit" className="btn btn-secondary" aria-label={t("common.add")}>
                <Plus aria-hidden className="size-4" />
              </button>
            </form>
          </section>

          <section aria-labelledby="budget" className="card p-5">
            <h2 id="budget" className="mb-3 text-lg font-bold">
              {t("trips.budget")}
            </h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-muted">
                  <th scope="col" className="pb-2 font-bold" />
                  <th scope="col" className="pb-2 text-right font-bold">
                    {t("trips.planned")}
                  </th>
                  <th scope="col" className="pb-2 text-right font-bold">
                    {t("trips.actual")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {trip.budget.map((b) => (
                  <tr key={b.id}>
                    <th scope="row" className="py-2 text-left font-medium">
                      {loc(b.label, lang)}
                    </th>
                    <td className="py-2 text-right tabular-nums">{money(b.planned, lang)}</td>
                    <td className="py-2 text-right">
                      <label className="sr-only" htmlFor={`actual-${b.id}`}>
                        {t("trips.actual")}: {loc(b.label, lang)}
                      </label>
                      <input
                        id={`actual-${b.id}`}
                        type="number"
                        inputMode="numeric"
                        min={0}
                        className="input w-24 py-1 text-right tabular-nums"
                        value={b.actual ?? ""}
                        placeholder="—"
                        onChange={(e) =>
                          update((x) => ({ ...x, budget: x.budget.map((i) => (i.id === b.id ? { ...i, actual: e.target.value === "" ? null : Number(e.target.value) } : i)) }))
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-ink/20 font-bold">
                  <th scope="row" className="pt-2 text-left">
                    {t("trips.total")}
                  </th>
                  <td className="pt-2 text-right tabular-nums">{money(plannedTotal, lang)}</td>
                  <td className={`pt-2 text-right tabular-nums ${actualTotal > plannedTotal ? "text-fit-none" : ""}`}>{money(actualTotal, lang)}</td>
                </tr>
              </tfoot>
            </table>
            {plannedTotal > 0 && (
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-sand-100" role="progressbar" aria-valuemin={0} aria-valuemax={plannedTotal} aria-valuenow={actualTotal} aria-label={t("trips.actual")}>
                <div className={`h-full ${actualTotal > plannedTotal ? "bg-fit-none" : "bg-lagoon-600"}`} style={{ width: `${Math.min(100, (actualTotal / plannedTotal) * 100)}%` }} />
              </div>
            )}
          </section>

          <section aria-labelledby="drafts" className="card p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 id="drafts" className="text-lg font-bold">
                {t("trips.drafts")}
              </h2>
              <Link href={`/chat?program=${p.id}`} className="btn btn-secondary py-1.5">
                <MessageCircleHeart aria-hidden className="size-4" />
                {t("trips.draftJuni")}
              </Link>
            </div>
            {trip.drafts.length === 0 ? (
              <p className="text-sm text-muted">{t("trips.noDrafts")}</p>
            ) : (
              <ul className="space-y-3">
                {trip.drafts.map((d) => (
                  <li key={d.id}>
                    <DraftCard draft={d} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="space-y-5">
          <section aria-labelledby="deadlines" className="card p-5">
            <h2 id="deadlines" className="mb-3 flex items-center gap-2 font-bold">
              <CalendarClock aria-hidden className="size-5 text-clay-600" />
              {t("trips.deadlines")}
            </h2>
            <ul className="space-y-2 text-sm">
              <li className="flex justify-between gap-2">
                <span>{t("trips.appDeadline")}</span>
                <span className="font-semibold">{date(appDeadline, lang)}</span>
              </li>
              {dueItems.map((c) => (
                <li key={c.id} className="flex justify-between gap-2">
                  <span>{loc(c.label, lang)}</span>
                  <span className="shrink-0 font-semibold">{date(c.due!, lang)}</span>
                </li>
              ))}
            </ul>
            <label className="mt-4 flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" className="size-4 accent-clay-600" checked={trip.reminders} onChange={(e) => update((x) => ({ ...x, reminders: e.target.checked }))} />
              <Bell aria-hidden className="size-4" />
              {t("trips.reminders")}
            </label>
          </section>

          <section aria-labelledby="contact" className="card p-5 text-sm">
            <h2 id="contact" className="mb-2 font-bold">
              {t("trips.contact")}
            </h2>
            <p className="font-semibold">{school.name}</p>
            <VerificationBadge status={school.verification.status} className="mt-1" />
            <p className="mt-2 text-muted">{school.address ?? t("dest.noAddress")}</p>
            <p className="mt-1 flex items-center gap-1.5">
              <Mail aria-hidden className="size-4 text-muted" />
              {school.email}
            </p>
            <a href={school.website} target="_blank" rel="noopener noreferrer nofollow" className="mt-1 inline-block text-lagoon-700 underline">
              {school.website.replace("https://", "")}
            </a>
          </section>

          <Link href={`/programs/${p.id}`} className="btn btn-secondary w-full">
            {t("chat.viewProgram")}
          </Link>
        </aside>
      </div>
    </article>
  );
}

export function TripsView() {
  const { t } = useT();
  const params = useSearchParams();
  const trips = useAppState((s) => s.trips);
  const [filter, setFilter] = useState<TripStatus | "all">("all");
  const selected = trips.find((x) => x.id === params.get("trip"));
  if (selected) return <TripDetail trip={selected} />;

  const visible = trips.filter((x) => (filter === "all" ? x.status !== "completed" : x.status === filter));
  return (
    <>
      <PageHeader title={t("trips.title")} subtitle={t("trips.subtitle")} />
      <div role="group" aria-label={t("trips.moveTo")} className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1">
        {(["all", ...STATUSES] as const).map((s) => {
          const count = s === "all" ? trips.filter((x) => x.status !== "completed").length : trips.filter((x) => x.status === s).length;
          return (
            <button key={s} type="button" aria-pressed={filter === s} onClick={() => setFilter(s)} className={`chip shrink-0 ${filter === s ? "!border-ink !bg-ink !text-white" : ""}`}>
              {s === "all" ? t("common.viewAll") : t(`trips.status.${s}`)} <span className="opacity-70">{count}</span>
            </button>
          );
        })}
      </div>
      {visible.length ? (
        <ul className="grid gap-4 md:grid-cols-2">
          {visible.map((trip) => (
            <li key={trip.id}>
              <TripCard trip={trip} />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          action={
            <Link href="/chat" className="btn btn-primary">
              {t("chat.title")}
            </Link>
          }
        >
          {t("trips.empty")}
        </EmptyState>
      )}
    </>
  );
}
