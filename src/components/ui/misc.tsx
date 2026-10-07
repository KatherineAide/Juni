"use client";

import { Heart, Info, Landmark } from "lucide-react";
import { useT, type MessageKey } from "@/i18n";
import { date } from "@/lib/format";
import type { Source } from "@/lib/types";

export function HeartButton({ saved, onToggle, name, className = "" }: { saved: boolean; onToggle: () => void; name: string; className?: string }) {
  const { t } = useT();
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggle();
      }}
      aria-pressed={saved}
      aria-label={saved ? `${t("common.unsave")}: ${name}` : t("common.saveItem", { name })}
      className={`grid size-10 place-items-center rounded-full bg-white/95 shadow-sm transition hover:scale-105 ${className}`}
    >
      <Heart aria-hidden className={`size-5 ${saved ? "fill-clay-500 text-clay-500" : "text-ink"}`} />
    </button>
  );
}

/** Source + "last checked" line shown with every price and date. */
export function SourceNote({ source, checked, className = "" }: { source: Source; checked: string; className?: string }) {
  const { t, lang } = useT();
  return (
    <p className={`text-xs text-muted ${className}`}>
      {t("common.source")}:{" "}
      <a href={source.url} target="_blank" rel="noopener noreferrer nofollow" className="underline decoration-dotted underline-offset-2 hover:text-ink">
        {source.label}
      </a>{" "}
      · {t("common.lastChecked", { date: date(checked, lang) })}
    </p>
  );
}

export function EmbassyNote({ className = "" }: { className?: string }) {
  const { t } = useT();
  return (
    <p className={`flex items-start gap-2 rounded-xl bg-lagoon-50 px-3 py-2 text-sm text-lagoon-700 ${className}`}>
      <Landmark aria-hidden className="mt-0.5 size-4 shrink-0" />
      <span className="font-medium">{t("common.embassy")}</span>
    </p>
  );
}

export function InfoNote({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={`flex items-start gap-2 text-sm text-muted ${className}`}>
      <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="h-display text-3xl font-semibold sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1 text-muted">{subtitle}</p>}
      </div>
      {children}
    </header>
  );
}

export function SectionTitle({ children, id }: { children: React.ReactNode; id?: string }) {
  return (
    <h2 id={id} className="h-display mb-3 text-xl font-semibold sm:text-2xl">
      {children}
    </h2>
  );
}

export function EmptyState({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-4 px-6 py-12 text-center text-muted">
      <p>{children}</p>
      {action}
    </div>
  );
}

/** Page header that can be rendered from a Server Component page. */
export function TPageHeader({ title, subtitle }: { title: MessageKey; subtitle?: MessageKey }) {
  const { t } = useT();
  return <PageHeader title={t(title)} subtitle={subtitle ? t(subtitle) : undefined} />;
}
