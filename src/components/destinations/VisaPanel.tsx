"use client";

import { useState } from "react";
import { getVisaRule, passports, VISA_LAST_CHECKED } from "@/data/visa";
import { useT } from "@/i18n";
import { date } from "@/lib/format";
import { useAppState } from "@/lib/store";
import type { Destination, PassportCode, VisaStatus } from "@/lib/types";
import { EmbassyNote } from "../ui/misc";

const statusStyle: Record<VisaStatus, string> = {
  domestic: "bg-fit-strong-bg text-fit-strong",
  "free-movement": "bg-fit-strong-bg text-fit-strong",
  "visa-free": "bg-fit-strong-bg text-fit-strong",
  evisa: "bg-fit-partial-bg text-fit-partial",
  "visa-required": "bg-fit-none-bg text-fit-none",
  check: "bg-slate-100 text-slate-700",
};

export function VisaPanel({ destination }: { destination: Destination }) {
  const { t, lang } = useT();
  const profilePassport = useAppState((s) => s.profile.passport);
  const [chosen, setChosen] = useState<PassportCode | "" | null>(null);
  const passport = chosen ?? profilePassport;
  const rule = getVisaRule(destination.countryCode, passport);

  return (
    <div>
      <label className="block max-w-xs">
        <span className="label">{t("dest.visaFor")}</span>
        <select className="input" value={passport} onChange={(e) => setChosen(e.target.value as PassportCode | "")}>
          <option value="">{t("dest.visaPick")}</option>
          {passports.map((p) => (
            <option key={p.code} value={p.code}>
              {p.name[lang]}
            </option>
          ))}
        </select>
      </label>
      {rule && (
        <div className="mt-3" aria-live="polite">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusStyle[rule.status]}`}>{t(`dest.visa.${rule.status}`)}</span>
            {rule.maxStayDays && <span className="text-sm font-semibold">{t("dest.visa.maxStay", { n: rule.maxStayDays })}</span>}
          </div>
          <p className="mt-2 text-sm">{rule.note[lang]}</p>
          <p className="mt-1 text-xs text-muted">{t("common.lastChecked", { date: date(VISA_LAST_CHECKED, lang) })}</p>
        </div>
      )}
      <EmbassyNote className="mt-3" />
    </div>
  );
}
