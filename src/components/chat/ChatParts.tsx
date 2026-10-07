"use client";

import { AlertTriangle, Check, ChevronDown, CircleDashed, ClipboardCopy, ExternalLink, Globe, Mail, PencilLine, ShieldCheck, ThumbsDown, ThumbsUp, Workflow } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { getDestination } from "@/data/destinations";
import { getProgram } from "@/data/programs";
import { getSchool } from "@/data/schools";
import { useT } from "@/i18n";
import type { ActionProposal } from "@/lib/agents/types";
import type { ChatPart, WebFinding } from "@/lib/chat";
import { loc, money } from "@/lib/format";
import type { DraftMessage, FitResult } from "@/lib/types";
import { CompareTable } from "../programs/CompareTable";
import { CostBreakdown } from "../programs/CostBreakdown";
import { ProgramCard } from "../programs/ProgramCard";
import { RiskFlagPill } from "../ui/badges";
import { approveProposal, editProposal, rejectProposal, sendMessage } from "./juni-actions";

export function Part({ part, interactive }: { part: ChatPart; interactive: boolean }) {
  const { t, lang } = useT();
  switch (part.type) {
    case "text":
      return <p className="whitespace-pre-line">{loc(part.text, lang)}</p>;
    case "chips":
      return (
        <div className="flex flex-wrap gap-2">
          {part.chips.map((c) => (
            <button key={c.label.en} type="button" className="chip" disabled={!interactive} onClick={() => sendMessage(c.value[lang])}>
              {c.label[lang]}
            </button>
          ))}
        </div>
      );
    case "steps":
      return (
        <details className="group rounded-xl border border-line bg-sand-50 text-sm">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 font-semibold text-muted">
            <Workflow aria-hidden className="size-4" />
            {t("chat.steps")}
            <ChevronDown aria-hidden className="ml-auto size-4 transition group-open:rotate-180" />
          </summary>
          <ol className="space-y-1.5 px-3 pb-3">
            {part.steps.map((s, i) => (
              <li key={i} className="flex gap-2">
                <span className="w-24 shrink-0 font-bold text-lagoon-700">{t(`chat.agent.${s.agent}`)}</span>
                <span>{s.summary[lang]}</span>
              </li>
            ))}
          </ol>
        </details>
      );
    case "results":
      return <Results results={part.results} flagged={part.flagged} />;
    case "cost": {
      const p = getProgram(part.result.programId)!;
      return (
        <section className="card p-4" aria-label={t("chat.costTitle", { program: p.title[lang] })}>
          <h3 className="mb-2 font-bold">{t("chat.costTitle", { program: p.title[lang] })}</h3>
          <CostBreakdown key={part.result.programId} program={p} initialWeeks={part.result.estimate.weeks} initialHousing={part.result.estimate.housingType} />
        </section>
      );
    }
    case "compare":
      return (
        <section aria-label={t("chat.compareTitle")}>
          <h3 className="mb-2 font-bold">{t("chat.compareTitle")}</h3>
          <CompareTable ids={part.results.map((r) => r.programId)} fits={part.results} />
        </section>
      );
    case "proposal":
      return <ProposalCard proposal={part.proposal} interactive={interactive} />;
    case "draft":
      return <DraftCard draft={part.draft} />;
    case "web":
      return <WebFindings findings={part.findings} />;
  }
}

/** Leads Scout found on the web. Shown apart from (and never ranked with) verified programs. */
function WebFindings({ findings }: { findings: WebFinding[] }) {
  const { t, lang } = useT();
  return (
    <section aria-label={t("chat.web")} className="rounded-2xl border border-dashed border-slate-300 bg-white p-4">
      <h3 className="mb-2 flex items-center gap-2 font-bold">
        <Globe aria-hidden className="size-5 text-slate-600" />
        {t("chat.web")}
      </h3>
      <ul className="space-y-3">
        {findings.map((f) => (
          <li key={f.url} className="rounded-xl bg-slate-50 p-3 text-sm">
            <p className="flex flex-wrap items-center gap-2 font-semibold">
              {f.title}
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">
                <CircleDashed aria-hidden className="size-3" />
                {t("verify.unverified")}
              </span>
            </p>
            <p className="text-muted">
              {f.school} · {f.city}, {f.country}
              {f.weeks ? ` · ${f.weeks}` : ""}
            </p>
            {f.pricePerWeekUsd != null && <p className="mt-1">{t("chat.webPrice", { price: money(f.pricePerWeekUsd, lang) })}</p>}
            {f.notes && <p className="mt-1 text-muted">{f.notes}</p>}
            {f.redFlags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {f.redFlags.map((flag) => (
                  <RiskFlagPill key={flag}>{flag}</RiskFlagPill>
                ))}
              </div>
            )}
            <a href={f.url} target="_blank" rel="noopener noreferrer nofollow" className="mt-2 inline-flex items-center gap-1 font-semibold text-lagoon-700 underline">
              {t("chat.webOpen")}
              <ExternalLink aria-hidden className="size-3.5" />
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Results({ results, flagged }: { results: FitResult[]; flagged: FitResult[] }) {
  const { t, lang } = useT();
  return (
    <div className="space-y-4">
      {results.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2">
          {results.map((r) => (
            <li key={r.programId}>
              <ProgramCard program={getProgram(r.programId)!} fit={r} compact />
            </li>
          ))}
        </ul>
      )}
      {flagged.length > 0 && (
        <section aria-label={t("chat.flagged")} className="rounded-2xl border border-red-200 bg-fit-none-bg/60 p-4">
          <h3 className="mb-2 flex items-center gap-2 font-bold text-fit-none">
            <AlertTriangle aria-hidden className="size-5" />
            {t("chat.flagged")}
          </h3>
          <ul className="space-y-3">
            {flagged.map((r) => {
              const p = getProgram(r.programId)!;
              const school = getSchool(p.schoolId)!;
              return (
                <li key={r.programId} className="rounded-xl bg-white p-3">
                  <p className="font-semibold">
                    {p.title[lang]} <span className="font-normal text-muted">· {school.name}, {getDestination(p.destinationId)!.name}</span>
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {r.riskFlags.map((f) => (
                      <RiskFlagPill key={f.en}>{f[lang]}</RiskFlagPill>
                    ))}
                  </div>
                  <Link href={`/programs/${p.id}`} className="mt-2 inline-block text-sm font-semibold text-fit-none underline">
                    {t("verify.details")}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

function ProposalCard({ proposal, interactive }: { proposal: ActionProposal; interactive: boolean }) {
  const { t, lang } = useT();
  const p = getProgram(proposal.programId)!;
  const school = getSchool(p.schoolId)!;
  const [text, setText] = useState(proposal.questions.join("\n"));
  const status = proposal.status;

  return (
    <section className={`rounded-2xl border-2 p-4 ${status === "pending" || status === "editing" ? "border-lagoon-600 bg-lagoon-50/60" : "border-line bg-white"}`} aria-label={t("chat.proposalTitle")}>
      <h3 className="flex items-center gap-2 font-bold">
        <ShieldCheck aria-hidden className="size-5 text-lagoon-700" />
        {t("chat.proposalTitle")}
      </h3>
      <p className="mt-1 text-sm">
        <span className="font-semibold">{t("chat.proposalTo")}:</span> {school.name} &lt;{proposal.to}&gt; · {p.title[lang]}
      </p>
      {status === "editing" ? (
        <label className="mt-3 block">
          <span className="label">{t("chat.editQuestions")}</span>
          <textarea className="input min-h-36" value={text} onChange={(e) => setText(e.target.value)} />
        </label>
      ) : (
        <>
          <p className="mt-3 text-sm font-semibold">{t("chat.proposalAsk")}:</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm">
            {proposal.questions.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
        </>
      )}
      <p className="mt-3 text-xs font-semibold text-lagoon-700">{t("chat.proposalNote")}</p>
      {status === "pending" && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className="btn btn-teal" disabled={!interactive} onClick={() => approveProposal(proposal)}>
            <ThumbsUp aria-hidden className="size-4" />
            {t("chat.approve")}
          </button>
          <button type="button" className="btn btn-secondary" disabled={!interactive} onClick={() => editProposal(proposal.id)}>
            <PencilLine aria-hidden className="size-4" />
            {t("common.edit")}
          </button>
          <button type="button" className="btn btn-ghost" disabled={!interactive} onClick={() => rejectProposal(proposal)}>
            <ThumbsDown aria-hidden className="size-4" />
            {t("chat.reject")}
          </button>
        </div>
      )}
      {status === "editing" && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-teal"
            onClick={() =>
              approveProposal(
                proposal,
                text
                  .split("\n")
                  .map((q) => q.trim())
                  .filter(Boolean),
              )
            }
          >
            <Check aria-hidden className="size-4" />
            {t("chat.saveAndApprove")}
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => rejectProposal(proposal)}>
            {t("chat.reject")}
          </button>
        </div>
      )}
      {status === "approved" && <p className="mt-3 text-sm font-bold text-fit-strong">✓ {t("chat.approved")}</p>}
      {status === "rejected" && <p className="mt-3 text-sm font-bold text-muted">✕ {t("chat.rejected")}</p>}
    </section>
  );
}

export function DraftCard({ draft }: { draft: DraftMessage }) {
  const { t } = useT();
  const [copied, setCopied] = useState(false);
  const mailto = `mailto:${draft.to}?subject=${encodeURIComponent(draft.subject)}&body=${encodeURIComponent(draft.body)}`;
  return (
    <section className="card overflow-hidden" aria-label={t("chat.draftTitle")}>
      <div className="flex items-center justify-between gap-2 border-b border-line bg-sand-50 px-4 py-2">
        <h3 className="text-sm font-bold">{t("chat.draftTitle")}</h3>
        <span className="rounded-full bg-fit-partial-bg px-2 py-0.5 text-xs font-bold text-fit-partial">{t("trips.notSent")}</span>
      </div>
      <div className="space-y-1 px-4 pt-3 text-sm">
        <p>
          <span className="font-semibold">{t("chat.proposalTo")}:</span> {draft.to}
        </p>
        <p>
          <span className="font-semibold">{t("chat.subject")}:</span> {draft.subject}
        </p>
      </div>
      <pre className="m-4 whitespace-pre-wrap rounded-xl bg-sand-50 p-3 font-sans text-sm">{draft.body}</pre>
      <div className="flex flex-wrap items-center gap-2 px-4 pb-4">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(`${draft.subject}\n\n${draft.body}`);
              setCopied(true);
            } catch {
              setCopied(false);
            }
          }}
        >
          <ClipboardCopy aria-hidden className="size-4" />
          {copied ? t("chat.copied") : t("chat.copy")}
        </button>
        <a className="btn btn-secondary" href={mailto}>
          <Mail aria-hidden className="size-4" />
          {t("chat.openEmail")}
        </a>
        <Link href="/trips" className="text-sm font-semibold text-lagoon-700 underline">
          {t("chat.savedToTrip")}
        </Link>
      </div>
    </section>
  );
}
