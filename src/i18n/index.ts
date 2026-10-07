import { useCallback } from "react";
import { useLang } from "@/lib/store";
import type { Lang } from "@/lib/types";
import { en, type MessageKey } from "./en";
import { es } from "./es";

export type { MessageKey };

const dictionaries: Record<Lang, Record<MessageKey, string>> = { en, es };

export function translate(lang: Lang, key: MessageKey, vars?: Record<string, string | number>): string {
  let s = dictionaries[lang][key] ?? en[key];
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}

export type T = (key: MessageKey, vars?: Record<string, string | number>) => string;

/** Returns the current language and a translate function bound to it. */
export function useT(): { t: T; lang: Lang } {
  const lang = useLang();
  const t = useCallback<T>((key, vars) => translate(lang, key, vars), [lang]);
  return { t, lang };
}
