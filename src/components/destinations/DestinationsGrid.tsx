"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { destinations } from "@/data/destinations";
import { programsByDestination } from "@/data/programs";
import { useT } from "@/i18n";
import { money } from "@/lib/format";
import { actions, useAppState } from "@/lib/store";
import type { Destination } from "@/lib/types";
import { HeartButton, PageHeader } from "../ui/misc";
import { Photo } from "../ui/Photo";

export function DestinationCard({ d, large = false }: { d: Destination; large?: boolean }) {
  const { t, lang } = useT();
  const saved = useAppState((s) => s.savedDestinations.includes(d.id));
  const count = programsByDestination(d.id).length;
  const weekly = d.costs.course.min + d.costs.housing.min + d.costs.living.min;
  return (
    <article className="group relative overflow-hidden rounded-[var(--radius-card)] bg-ink">
      <Photo src={d.image} alt={d.imageAlt[lang]} className={`${large ? "aspect-[4/5] sm:aspect-[16/10]" : "aspect-[4/5]"} transition-transform duration-500 group-hover:scale-105`} />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
      <HeartButton saved={saved} onToggle={() => actions.toggleSavedDestination(d.id)} name={d.name} className="absolute right-3 top-3 z-10" />
      <div className="absolute inset-x-0 bottom-0 p-5 text-white">
        <p className="text-xs font-bold uppercase tracking-widest text-white/80">
          {d.country[lang]} · {d.region[lang]}
        </p>
        <h3 className="h-display mt-1 text-2xl font-semibold sm:text-3xl">
          <Link href={`/destinations/${d.id}`} className="after:absolute after:inset-0 after:content-[''] hover:underline">
            {d.name}
          </Link>
        </h3>
        <p className="mt-1 line-clamp-2 text-sm text-white/90">{d.tagline[lang]}</p>
        <p className="mt-2 text-xs font-semibold text-white/85">
          {t("dest.programsCount", { n: count })} · {t("common.from")} {money(weekly, lang)}
          {t("common.perWeek")}
        </p>
      </div>
    </article>
  );
}

export function DestinationsGrid() {
  const { t, lang } = useT();
  const [q, setQ] = useState("");
  const list = destinations.filter((d) => `${d.name} ${d.country.en} ${d.country.es} ${d.region[lang]}`.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <>
      <PageHeader title={t("dest.title")} subtitle={t("dest.subtitle")}>
        <label className="relative w-full sm:w-72">
          <span className="sr-only">{t("dest.search")}</span>
          <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input className="input pl-9" type="search" placeholder={t("dest.search")} value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
      </PageHeader>
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((d, i) => (
          <li key={d.id} className={i === 0 && !q ? "sm:col-span-2" : ""}>
            <DestinationCard d={d} large={i === 0 && !q} />
          </li>
        ))}
      </ul>
    </>
  );
}
