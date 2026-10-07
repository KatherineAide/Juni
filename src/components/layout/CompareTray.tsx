"use client";

import { Columns3, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getProgram } from "@/data/programs";
import { useT } from "@/i18n";
import { actions, useAppState } from "@/lib/store";

export function CompareTray() {
  const { t, lang } = useT();
  const compare = useAppState((s) => s.compare);
  const pathname = usePathname();
  if (!compare.length || pathname.replace(/\/$/, "") === "/programs/compare") return null;
  return (
    <div className="fixed inset-x-3 bottom-20 z-30 mx-auto max-w-xl rounded-2xl border border-line bg-ink p-3 text-white shadow-xl lg:bottom-6 lg:left-64 lg:right-0">
      <div className="flex flex-wrap items-center gap-2">
        <Columns3 aria-hidden className="size-5" />
        <p className="flex-1 text-sm font-semibold" aria-live="polite">
          {t("prog.compareTray", { n: compare.length })}
        </p>
        <button type="button" onClick={actions.clearCompare} className="rounded-full px-3 py-1.5 text-sm font-semibold text-white/80 hover:bg-white/10">
          {t("prog.clear")}
        </button>
        <Link href="/programs/compare" className="btn bg-white py-1.5 text-ink hover:bg-sand-100">
          {t("prog.compareNow")}
        </Link>
      </div>
      <ul className="mt-2 flex flex-wrap gap-1.5">
        {compare.map((id) => {
          const p = getProgram(id);
          if (!p) return null;
          return (
            <li key={id} className="inline-flex items-center gap-1 rounded-full bg-white/10 py-0.5 pl-3 pr-1 text-xs">
              <span className="max-w-48 truncate">{p.title[lang]}</span>
              <button type="button" onClick={() => actions.toggleCompare(id)} aria-label={`${t("prog.remove")}: ${p.title[lang]}`} className="grid size-6 place-items-center rounded-full hover:bg-white/20">
                <X aria-hidden className="size-3.5" />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
