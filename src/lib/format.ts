import type { L, Lang } from "./types";

const locales: Record<Lang, string> = { en: "en-US", es: "es-ES" };

export function loc(l: L | string, lang: Lang): string {
  return typeof l === "string" ? l : l[lang];
}

export function money(amount: number, lang: Lang, currency = "USD"): string {
  return new Intl.NumberFormat(locales[lang], {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Dates are stored as ISO days and always formatted in UTC so server and client agree. */
export function date(iso: string, lang: Lang, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }): string {
  return new Intl.DateTimeFormat(locales[lang], { ...opts, timeZone: "UTC" }).format(new Date(iso + (iso.length === 10 ? "T00:00:00Z" : "")));
}

export function dateRange(start: string, end: string, lang: Lang): string {
  return `${date(start, lang, { day: "numeric", month: "short" })} – ${date(end, lang)}`;
}

export function monthName(month: number, lang: Lang): string {
  return new Intl.DateTimeFormat(locales[lang], { month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(2027, month, 1)));
}

export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((Date.parse(toIso) - Date.parse(fromIso)) / 86_400_000);
}

export function addDays(iso: string, days: number): string {
  return new Date(Date.parse(iso) + days * 86_400_000).toISOString().slice(0, 10);
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function uid(prefix = "id"): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}
