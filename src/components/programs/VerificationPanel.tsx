"use client";

import { useT } from "@/i18n";
import { date } from "@/lib/format";
import type { VerificationRecord } from "@/lib/types";
import { CheckIcon, VerificationBadge } from "../ui/badges";

export function VerificationPanel({ record, schoolName }: { record: VerificationRecord; schoolName: string }) {
  const { t, lang } = useT();
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <VerificationBadge status={record.status} withTitle={false} />
        <span className="text-sm font-semibold">{schoolName}</span>
      </div>
      <p className="mt-2 text-sm text-muted">{t(`verify.${record.status}.desc`)}</p>
      <ul className="mt-3 space-y-2">
        {record.checks.map((c) => (
          <li key={c.id} className="flex gap-2 text-sm">
            <CheckIcon result={c.result} />
            <div>
              <p className="font-semibold">
                {t(`verify.check.${c.id}`)} <span className="sr-only">: {t(`verify.result.${c.result}`)}</span>
              </p>
              <p className="text-muted">{c.note[lang]}</p>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-3 text-xs text-muted">
        <p>
          {t("verify.sources")}:{" "}
          {record.sources.map((s, i) => (
            <span key={s.url}>
              {i > 0 && ", "}
              <a href={s.url} target="_blank" rel="noopener noreferrer nofollow" className="underline decoration-dotted underline-offset-2 hover:text-ink">
                {s.label}
              </a>
            </span>
          ))}
        </p>
        <p>{t("common.lastChecked", { date: date(record.lastChecked, lang) })}</p>
      </div>
    </div>
  );
}
