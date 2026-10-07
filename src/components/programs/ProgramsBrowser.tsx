"use client";

import { SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { categories } from "@/data/categories";
import { destinations } from "@/data/destinations";
import { programs } from "@/data/programs";
import { getSchool } from "@/data/schools";
import { useT } from "@/i18n";
import { evaluateProgram, upcomingSessions } from "@/lib/fit";
import { monthName } from "@/lib/format";
import { useAppState } from "@/lib/store";
import type { AccessibilityTag, CategoryId, HousingType, Level } from "@/lib/types";
import { Photo } from "../ui/Photo";
import { ProgramCard } from "./ProgramCard";

interface Filters {
  q: string;
  category: CategoryId | "";
  destination: string;
  month: string;
  duration: "" | "short" | "medium" | "long";
  maxPrice: number;
  level: Level | "";
  language: string;
  housing: HousingType | "";
  intensity: "" | "light" | "standard" | "intensive";
  accessibility: AccessibilityTag | "";
  certificate: boolean;
  verifiedOnly: boolean;
  sort: "match" | "price" | "rating" | "start";
}

const MAX_PRICE = 800;

const blank: Filters = {
  q: "",
  category: "",
  destination: "",
  month: "",
  duration: "",
  maxPrice: MAX_PRICE,
  level: "",
  language: "",
  housing: "",
  intensity: "",
  accessibility: "",
  certificate: false,
  verifiedOnly: false,
  sort: "match",
};

const allLanguages = [...new Set(programs.flatMap((p) => p.instructionLanguages))].sort();
const accessTags: AccessibilityTag[] = ["step-free", "accessible-housing", "hearing-support", "low-vision", "flexible-pace"];
const housingTypes: HousingType[] = ["homestay", "residence", "apartment", "hostel"];

export function CategoryTiles() {
  const { t, lang } = useT();
  return (
    <section aria-labelledby="cat-title" className="mb-10">
      <h2 id="cat-title" className="h-display mb-3 text-xl font-semibold">
        {t("prog.categories")}
      </h2>
      <ul className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 lg:grid-cols-4 xl:grid-cols-5">
        {categories.map((c) => (
          <li key={c.id} className="w-40 shrink-0 snap-start sm:w-auto">
            <Link href={`/programs?category=${c.id}`} scroll={false} className="group relative block overflow-hidden rounded-2xl">
              <Photo src={c.image} alt="" className="aspect-[4/3] transition-transform duration-300 group-hover:scale-105" />
              <span className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
              <span className="absolute inset-x-3 bottom-2.5 text-sm font-bold leading-tight text-white">{c.name[lang]}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ProgramsBrowser() {
  const params = useSearchParams();
  const { t, lang } = useT();
  const profile = useAppState((s) => s.profile);
  const initialCategory = (params.get("category") ?? "") as CategoryId | "";
  const initialDestination = params.get("destination") ?? "";
  const [filters, setFilters] = useState<Filters>({ ...blank, category: initialCategory, destination: initialDestination });
  const [showFilters, setShowFilters] = useState(false);

  // Keep the category in sync when a category tile changes the URL.
  const [lastParams, setLastParams] = useState(`${initialCategory}|${initialDestination}`);
  if (`${initialCategory}|${initialDestination}` !== lastParams) {
    setLastParams(`${initialCategory}|${initialDestination}`);
    setFilters((f) => ({ ...f, category: initialCategory, destination: initialDestination }));
  }

  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => setFilters((f) => ({ ...f, [k]: v }));

  const results = useMemo(() => {
    const req = { budget: profile.budgetMax, categories: profile.interests };
    const q = filters.q.trim().toLowerCase();
    const list = programs
      .filter((p) => {
        const school = getSchool(p.schoolId)!;
        if (q && !`${p.title.en} ${p.title.es} ${school.name} ${p.destinationId} ${p.tags.join(" ")}`.toLowerCase().includes(q)) return false;
        if (filters.category && p.category !== filters.category) return false;
        if (filters.destination && p.destinationId !== filters.destination) return false;
        if (filters.month && !upcomingSessions(p).some((s) => new Date(s.start).getUTCMonth() === Number(filters.month))) return false;
        if (filters.duration === "short" && p.weeks.min > 1) return false;
        if (filters.duration === "medium" && (p.weeks.max < 2 || p.weeks.min > 3)) return false;
        if (filters.duration === "long" && p.weeks.max < 4) return false;
        if (p.pricePerWeek > filters.maxPrice) return false;
        if (filters.level && p.level !== filters.level && p.level !== "all") return false;
        if (filters.language && !p.instructionLanguages.includes(filters.language)) return false;
        if (filters.housing && !p.housing.some((h) => h.type === filters.housing)) return false;
        if (filters.intensity === "light" && p.hoursPerWeek >= 20) return false;
        if (filters.intensity === "standard" && (p.hoursPerWeek < 20 || p.hoursPerWeek >= 30)) return false;
        if (filters.intensity === "intensive" && p.hoursPerWeek < 30) return false;
        if (filters.accessibility && !p.accessibility.includes(filters.accessibility)) return false;
        if (filters.certificate && !p.certificate) return false;
        if (filters.verifiedOnly && school.verification.status !== "verified") return false;
        return true;
      })
      .map((p) => ({ p, fit: evaluateProgram(p, req, profile) }));
    const firstStart = (id: string) => upcomingSessions(programs.find((x) => x.id === id)!)[0]?.start ?? "9999";
    list.sort((a, b) => {
      if (filters.sort === "price") return a.p.pricePerWeek - b.p.pricePerWeek;
      if (filters.sort === "rating") return (b.p.rating ?? 0) - (a.p.rating ?? 0);
      if (filters.sort === "start") return firstStart(a.p.id).localeCompare(firstStart(b.p.id));
      return b.fit.score - a.fit.score;
    });
    return list;
  }, [filters, profile]);

  const activeCount = Object.entries(filters).filter(([k, v]) => k !== "sort" && v !== blank[k as keyof Filters]).length;

  const select = (key: keyof Filters, label: string, options: { value: string; label: string }[], anyLabel = t("prog.f.any")) => (
    <label className="block">
      <span className="label">{label}</span>
      <select className="input" value={String(filters[key])} onChange={(e) => set(key, e.target.value as never)}>
        <option value="">{anyLabel}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <section aria-labelledby="results-title">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h2 id="results-title" className="h-display text-xl font-semibold" aria-live="polite">
          {t("prog.results", { n: results.length })}
        </h2>
        <div className="ml-auto flex items-center gap-2">
          <button type="button" className="btn btn-secondary lg:hidden" aria-expanded={showFilters} aria-controls="filters" onClick={() => setShowFilters((v) => !v)}>
            <SlidersHorizontal aria-hidden className="size-4" />
            {showFilters ? t("prog.hideFilters") : t("prog.showFilters")}
            {activeCount > 0 && <span className="rounded-full bg-clay-600 px-1.5 text-xs text-white">{activeCount}</span>}
          </button>
          <label className="flex items-center gap-2 text-sm">
            <span className="font-semibold">{t("prog.sort")}</span>
            <select className="input w-auto py-2" value={filters.sort} onChange={(e) => set("sort", e.target.value as Filters["sort"])}>
              <option value="match">{t("prog.sort.match")}</option>
              <option value="price">{t("prog.sort.price")}</option>
              <option value="rating">{t("prog.sort.rating")}</option>
              <option value="start">{t("prog.sort.start")}</option>
            </select>
          </label>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <form
          id="filters"
          aria-label={t("prog.filters")}
          onSubmit={(e) => e.preventDefault()}
          className={`card h-fit space-y-4 p-4 lg:sticky lg:top-6 lg:block ${showFilters ? "block" : "hidden"}`}
        >
          <label className="block">
            <span className="label">{t("prog.f.search")}</span>
            <input className="input" type="search" value={filters.q} onChange={(e) => set("q", e.target.value)} />
          </label>
          {select("category", t("prog.f.category"), categories.map((c) => ({ value: c.id, label: c.name[lang] })))}
          {select("destination", t("prog.f.destination"), destinations.map((d) => ({ value: d.id, label: `${d.name}, ${d.country[lang]}` })))}
          {select("month", t("prog.f.month"), Array.from({ length: 12 }, (_, m) => ({ value: String(m), label: monthName(m, lang) })), t("prog.f.anyMonth"))}
          {select("duration", t("prog.f.duration"), [
            { value: "short", label: t("prog.f.short") },
            { value: "medium", label: t("prog.f.medium") },
            { value: "long", label: t("prog.f.long") },
          ])}
          <label className="block">
            <span className="label">
              {t("prog.f.budget")}: <span className="font-normal">{filters.maxPrice >= MAX_PRICE ? t("prog.f.any") : `$${filters.maxPrice}`}</span>
            </span>
            <input type="range" min={100} max={MAX_PRICE} step={50} value={filters.maxPrice} onChange={(e) => set("maxPrice", Number(e.target.value))} className="w-full accent-clay-600" />
          </label>
          {select("level", t("prog.f.level"), (["beginner", "intermediate", "advanced"] as const).map((l) => ({ value: l, label: t(`common.level.${l}`) })))}
          {select("language", t("prog.f.language"), allLanguages.map((l) => ({ value: l, label: l })))}
          {select("housing", t("prog.f.housing"), housingTypes.map((h) => ({ value: h, label: t(`common.housing.${h}`) })))}
          {select("intensity", t("prog.f.intensity"), [
            { value: "light", label: t("prog.f.light") },
            { value: "standard", label: t("prog.f.standard") },
            { value: "intensive", label: t("prog.f.intensive") },
          ])}
          {select("accessibility", t("prog.f.accessibility"), accessTags.map((a) => ({ value: a, label: t(`common.access.${a}`) })))}
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" className="size-4 accent-clay-600" checked={filters.certificate} onChange={(e) => set("certificate", e.target.checked)} />
            {t("prog.f.certificate")}
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" className="size-4 accent-clay-600" checked={filters.verifiedOnly} onChange={(e) => set("verifiedOnly", e.target.checked)} />
            {t("prog.f.verifiedOnly")}
          </label>
          <button type="button" className="btn btn-ghost w-full" onClick={() => setFilters({ ...blank, sort: filters.sort })}>
            {t("prog.reset")}
          </button>
        </form>

        <div>
          {results.length ? (
            <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {results.map(({ p }) => (
                <li key={p.id} className="flex">
                  <div className="w-full">
                    <ProgramCard program={p} />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="card p-10 text-center text-muted">{t("prog.empty")}</div>
          )}
          <p className="mt-6 text-xs text-muted">{t("prog.rankingNote")}</p>
        </div>
      </div>
    </section>
  );
}
