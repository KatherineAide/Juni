"use client";

import { Ban, Banknote, FileX2, Landmark, MapPinOff, MessageSquareWarning, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useT, type MessageKey } from "@/i18n";
import { VerificationBadge } from "../ui/badges";
import { PageHeader, SectionTitle } from "../ui/misc";

const flags: { title: MessageKey; desc: MessageKey; Icon: typeof Ban }[] = [
  { title: "trust.flag.wire", desc: "trust.flag.wireDesc", Icon: Banknote },
  { title: "trust.flag.visa", desc: "trust.flag.visaDesc", Icon: Landmark },
  { title: "trust.flag.address", desc: "trust.flag.addressDesc", Icon: MapPinOff },
  { title: "trust.flag.refund", desc: "trust.flag.refundDesc", Icon: FileX2 },
  { title: "trust.flag.reviews", desc: "trust.flag.reviewsDesc", Icon: MessageSquareWarning },
];

const checks: MessageKey[] = [
  "verify.check.physical_address",
  "verify.check.payment_methods",
  "verify.check.refund_policy",
  "verify.check.independent_reviews",
  "verify.check.visa_claims",
  "verify.check.registration",
  "verify.check.price_crosscheck",
];

const promises: MessageKey[] = ["trust.p.approval", "trust.p.commission", "trust.p.untrusted", "trust.p.sources", "trust.p.visa", "trust.p.privacy"];

export function TrustView() {
  const { t } = useT();
  return (
    <>
      <PageHeader title={t("trust.title")} subtitle={t("trust.subtitle")} />
      <div className="space-y-10">
        <section aria-labelledby="badges">
          <SectionTitle id="badges">{t("trust.badges")}</SectionTitle>
          <ul className="grid gap-4 md:grid-cols-3">
            {(["verified", "unverified", "risk"] as const).map((s) => (
              <li key={s} className="card p-5">
                <VerificationBadge status={s} withTitle={false} />
                <p className="mt-3 text-sm">{t(`verify.${s}.desc`)}</p>
              </li>
            ))}
          </ul>
          <ul className="mt-4 grid gap-4 md:grid-cols-3">
            {(["strong", "partial", "none"] as const).map((s) => (
              <li key={s} className={`rounded-2xl p-4 text-sm font-semibold ${s === "strong" ? "bg-fit-strong-bg text-fit-strong" : s === "partial" ? "bg-fit-partial-bg text-fit-partial" : "bg-fit-none-bg text-fit-none"}`}>
                {t(`fit.${s}`)}
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="how" className="card p-6">
          <SectionTitle id="how">{t("trust.how")}</SectionTitle>
          <p className="text-muted">{t("trust.howBody")}</p>
          <ol className="mt-4 grid gap-2 sm:grid-cols-2">
            {checks.map((c, i) => (
              <li key={c} className="flex items-center gap-3 rounded-xl bg-sand-50 px-3 py-2 text-sm font-semibold">
                <span className="grid size-7 place-items-center rounded-full bg-lagoon-600 text-xs text-white">{i + 1}</span>
                {t(c)}
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="flags">
          <SectionTitle id="flags">{t("trust.redFlags")}</SectionTitle>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {flags.map(({ title, desc, Icon }) => (
              <li key={title} className="card border-red-100 p-5">
                <span className="grid size-10 place-items-center rounded-full bg-fit-none-bg text-fit-none">
                  <Icon aria-hidden className="size-5" />
                </span>
                <h3 className="mt-3 font-bold">{t(title)}</h3>
                <p className="mt-1 text-sm text-muted">{t(desc)}</p>
              </li>
            ))}
          </ul>
          <Link href="/programs/risk-antigua-visa-package" className="mt-4 inline-block font-semibold text-fit-none underline">
            {t("trust.example")} →
          </Link>
        </section>

        <section aria-labelledby="promises" className="rounded-[var(--radius-card)] bg-ink p-6 text-white sm:p-8">
          <h2 id="promises" className="h-display mb-4 flex items-center gap-2 text-2xl font-semibold">
            <ShieldCheck aria-hidden className="size-6" />
            {t("trust.principles")}
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {promises.map((p) => (
              <li key={p} className="flex gap-2">
                <span aria-hidden className="text-[#f7d38a]">
                  ✓
                </span>
                {t(p)}
              </li>
            ))}
          </ul>
        </section>
        <p className="text-sm text-muted">{t("trust.report")}</p>
      </div>
    </>
  );
}
