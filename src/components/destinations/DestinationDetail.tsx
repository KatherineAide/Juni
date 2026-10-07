"use client";

import { Accessibility, ArrowLeft, CloudSun, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { programsByDestination } from "@/data/programs";
import { schools } from "@/data/schools";
import { useT } from "@/i18n";
import { money } from "@/lib/format";
import { actions, useAppState } from "@/lib/store";
import type { Destination } from "@/lib/types";
import { ProgramCard } from "../programs/ProgramCard";
import { HeartButton, SectionTitle, SourceNote } from "../ui/misc";
import { Photo } from "../ui/Photo";
import { SchoolMap } from "./SchoolMap";
import { VisaPanel } from "./VisaPanel";

export function DestinationDetail({ destination: d }: { destination: Destination }) {
  const { t, lang } = useT();
  const saved = useAppState((s) => s.savedDestinations.includes(d.id));
  const list = programsByDestination(d.id);
  const local = schools.filter((s) => s.destinationId === d.id);
  const range = (r: { min: number; max: number }) => `${money(r.min, lang)}–${money(r.max, lang)}`;

  return (
    <article>
      <Link href="/destinations" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-ink">
        <ArrowLeft aria-hidden className="size-4" />
        {t("common.back")}
      </Link>
      <div className="relative overflow-hidden rounded-[var(--radius-card)]">
        <Photo src={d.image} alt={d.imageAlt[lang]} priority className="aspect-[4/3] max-h-[480px] w-full sm:aspect-[21/9]" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-8">
          <p className="text-xs font-bold uppercase tracking-widest text-white/85">
            {d.country[lang]} · {d.region[lang]}
          </p>
          <h1 className="h-display text-4xl font-semibold sm:text-6xl">{d.name}</h1>
          <p className="mt-2 max-w-2xl text-white/90 sm:text-lg">{d.tagline[lang]}</p>
        </div>
        <HeartButton saved={saved} onToggle={() => actions.toggleSavedDestination(d.id)} name={d.name} className="absolute right-4 top-4" />
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-10">
          <section aria-labelledby="overview">
            <SectionTitle id="overview">{t("dest.overview")}</SectionTitle>
            <p className="text-lg leading-relaxed">{d.overview[lang]}</p>
          </section>

          <section aria-labelledby="programs-here">
            <SectionTitle id="programs-here">
              {t("dest.programsHere")} <span className="text-base font-normal text-muted">({list.length})</span>
            </SectionTitle>
            <ul className="grid gap-5 sm:grid-cols-2">
              {list.map((p) => (
                <li key={p.id}>
                  <ProgramCard program={p} compact />
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="map">
            <SectionTitle id="map">{t("dest.map")}</SectionTitle>
            <SchoolMap destination={d} schools={local} />
          </section>
        </div>

        <aside className="space-y-5">
          <section aria-labelledby="costs" className="card p-5">
            <h2 id="costs" className="mb-3 font-bold">
              {t("dest.costs")}
            </h2>
            <dl className="divide-y divide-line text-sm">
              {(
                [
                  ["dest.cost.course", d.costs.course],
                  ["dest.cost.housing", d.costs.housing],
                  ["dest.cost.living", d.costs.living],
                ] as const
              ).map(([k, r]) => (
                <div key={k} className="flex justify-between gap-3 py-2">
                  <dt className="text-muted">{t(k)}</dt>
                  <dd className="font-semibold tabular-nums">{range(r)}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-2 text-sm font-semibold">{t("dest.currency", { rate: d.currency.perUsd, code: d.currency.code })}</p>
            <SourceNote source={d.currency.source} checked={d.currency.lastChecked} />
          </section>

          <section aria-labelledby="visa" className="card p-5">
            <h2 id="visa" className="mb-3 font-bold">
              {t("dest.visa")}
            </h2>
            <VisaPanel destination={d} />
          </section>

          {(
            [
              ["seasons", "dest.seasons", d.bestSeasons, CloudSun],
              ["safety", "dest.safety", d.safety, ShieldCheck],
              ["access", "dest.accessibility", d.accessibility, Accessibility],
            ] as const
          ).map(([id, key, text, Icon]) => (
            <section key={id} aria-labelledby={id} className="card p-5">
              <h2 id={id} className="mb-2 flex items-center gap-2 font-bold">
                <Icon aria-hidden className="size-5 text-clay-600" />
                {t(key)}
              </h2>
              <p className="text-sm leading-relaxed text-muted">{text[lang]}</p>
            </section>
          ))}
        </aside>
      </div>
    </article>
  );
}
