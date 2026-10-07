"use client";

import { AlertTriangle, BadgeCheck, CircleCheck, CircleDashed, CircleHelp, CircleMinus, CircleX, ShieldAlert, Star } from "lucide-react";
import { useT } from "@/i18n";
import type { FitStatus, VerificationStatus } from "@/lib/types";

const fitStyles: Record<FitStatus, { cls: string; Icon: typeof CircleCheck }> = {
  strong: { cls: "bg-fit-strong-bg text-fit-strong", Icon: CircleCheck },
  partial: { cls: "bg-fit-partial-bg text-fit-partial", Icon: CircleMinus },
  none: { cls: "bg-fit-none-bg text-fit-none", Icon: CircleX },
};

export function FitBadge({ status, className = "" }: { status: FitStatus; className?: string }) {
  const { t } = useT();
  const { cls, Icon } = fitStyles[status];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${cls} ${className}`}>
      <Icon aria-hidden className="size-3.5" />
      {t(`fit.${status}`)}
    </span>
  );
}

const verifyStyles: Record<VerificationStatus, { cls: string; Icon: typeof BadgeCheck }> = {
  verified: { cls: "bg-lagoon-50 text-lagoon-700 border-lagoon-100", Icon: BadgeCheck },
  unverified: { cls: "bg-slate-100 text-slate-700 border-slate-200", Icon: CircleDashed },
  risk: { cls: "bg-fit-none-bg text-fit-none border-red-200", Icon: ShieldAlert },
};

export function VerificationBadge({ status, withTitle = true, className = "" }: { status: VerificationStatus; withTitle?: boolean; className?: string }) {
  const { t } = useT();
  const { cls, Icon } = verifyStyles[status];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold ${cls} ${className}`}
      title={withTitle ? t(`verify.${status}.desc`) : undefined}
    >
      <Icon aria-hidden className="size-3.5" />
      {t(`verify.${status}`)}
    </span>
  );
}

export function CheckIcon({ result }: { result: "pass" | "fail" | "unknown" | boolean | "partial" }) {
  if (result === "pass" || result === true) return <CircleCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-fit-strong" />;
  if (result === "fail" || result === false) return <CircleX aria-hidden className="mt-0.5 size-4 shrink-0 text-fit-none" />;
  if (result === "partial") return <CircleMinus aria-hidden className="mt-0.5 size-4 shrink-0 text-fit-partial" />;
  return <CircleHelp aria-hidden className="mt-0.5 size-4 shrink-0 text-slate-500" />;
}

export function Rating({ rating, count }: { rating: number | null; count: number }) {
  const { t } = useT();
  if (!rating) return <span className="text-sm text-muted">{t("common.noReviews")}</span>;
  return (
    <span className="inline-flex items-center gap-1 text-sm">
      <Star aria-hidden className="size-4 fill-amber-400 text-amber-500" />
      <span className="font-semibold">{rating.toFixed(1)}</span>
      <span className="text-muted">({t("common.reviews", { n: count })})</span>
    </span>
  );
}

export function RiskFlagPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-fit-none-bg px-2 py-0.5 text-xs font-semibold text-fit-none">
      <AlertTriangle aria-hidden className="size-3" />
      {children}
    </span>
  );
}

export function MockPill() {
  const { t } = useT();
  return <span className="rounded-full bg-sand-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted">{t("common.mockData")}</span>;
}
