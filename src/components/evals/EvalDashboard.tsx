"use client";

import { CircleCheck, CircleMinus, CircleX, Play, Table2, BarChart3 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getProgram } from "@/data/programs";
import { useT, type MessageKey } from "@/i18n";
import { backendEnabled } from "@/lib/api";
import { loadEvalData, loadRun, startRun, type CaseResult, type EvalData, type EvalRun, type Outcome } from "@/lib/evals";
import { PageHeader, SectionTitle } from "../ui/misc";
import { RateBars, TrendLine } from "./charts";

const pct = (v: number) => `${Math.round(v * 100)}%`;
const compact = (n: number) => new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n);

function OutcomeIcon({ outcome }: { outcome: Outcome }) {
  const { t } = useT();
  const label = t(`evals.outcome.${outcome}` as MessageKey);
  if (outcome === "pass") return <CircleCheck role="img" aria-label={label} className="size-5 text-fit-strong" />;
  if (outcome === "fail") return <CircleX role="img" aria-label={label} className="size-5 text-fit-none" />;
  return <CircleMinus role="img" aria-label={label} className="size-5 text-slate-300" />;
}

function StatTile({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="card p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-ink">{value}</p>
      {detail && <p className="mt-0.5 text-xs text-muted">{detail}</p>}
    </div>
  );
}

function ViewToggle({ table, onToggle }: { table: boolean; onToggle: () => void }) {
  const { t } = useT();
  return (
    <button type="button" onClick={onToggle} className="btn btn-ghost py-1.5 text-xs" aria-pressed={table}>
      {table ? <BarChart3 aria-hidden className="size-4" /> : <Table2 aria-hidden className="size-4" />}
      {table ? t("evals.showChart") : t("evals.showTable")}
    </button>
  );
}

function CaseDetail({ result, data }: { result: CaseResult; data: EvalData }) {
  const { t, lang } = useT();
  const kase = data.cases.find((c) => c.id === result.caseId);
  const label = (id: string) => data.checks.find((c) => c.id === id)?.label[lang] ?? id;
  const name = (id: string) => getProgram(id)?.title[lang] ?? id;
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    // The panel can render below the table on narrower screens; bring it into view.
    ref.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [result.caseId]);
  return (
    <section ref={ref} aria-labelledby="case-detail" className="card scroll-mt-20 space-y-5 p-5">
      <div>
        <h3 id="case-detail" className="text-lg font-bold">
          {result.name} <span className="font-normal text-muted">· {result.caseId}</span>
        </h3>
        {kase && <p className="mt-1 text-sm text-muted">{kase.persona[lang]}</p>}
      </div>
      <div>
        <h4 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted">{t("evals.findings")}</h4>
        <ul className="space-y-1.5 text-sm">
          {result.checks.map((c) => (
            <li key={c.id} className="flex items-start gap-2">
              <OutcomeIcon outcome={c.outcome} />
              <span>
                {label(c.id)}
                {c.detail && <span className="block text-xs text-muted">{c.detail}</span>}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h4 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted">{t("evals.conversation")}</h4>
        <ol className="space-y-3">
          {result.turns.map((turn, i) => (
            <li key={i} className="space-y-1.5 text-sm">
              <p className="ml-auto w-fit max-w-[90%] rounded-2xl rounded-br-md bg-ink px-3 py-2 text-white">{turn.user}</p>
              <div className="w-fit max-w-[95%] rounded-2xl rounded-tl-md border border-line bg-sand-50 px-3 py-2">
                <p>{turn.reply}</p>
                <dl className="mt-2 grid gap-0.5 text-xs text-muted">
                  <div>
                    <dt className="inline font-semibold">{t("evals.recommended")}: </dt>
                    <dd className="inline">{turn.recommended.length ? turn.recommended.map(name).join(", ") : t("evals.none")}</dd>
                  </div>
                  {turn.flagged.length > 0 && (
                    <div>
                      <dt className="inline font-semibold">{t("evals.flagged")}: </dt>
                      <dd className="inline">{turn.flagged.map(name).join(", ")}</dd>
                    </div>
                  )}
                  {turn.asked && (
                    <div>
                      <dt className="inline font-semibold">{t("evals.asked")}: </dt>
                      <dd className="inline">{turn.asked}</dd>
                    </div>
                  )}
                  <div>{t("evals.turnLatency", { ms: turn.latencyMs })}</div>
                </dl>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function EvalDashboard() {
  const { t, lang } = useT();
  const [data, setData] = useState<EvalData | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const [run, setRun] = useState<EvalRun | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checksAsTable, setChecksAsTable] = useState(false);
  const [trendAsTable, setTrendAsTable] = useState(false);

  const refresh = useCallback(async (preferId?: string) => {
    const d = await loadEvalData();
    setData(d);
    setRunId((cur) => preferId ?? cur ?? d.runs[0]?.id ?? null);
  }, []);

  useEffect(() => {
    let alive = true;
    loadEvalData().then((d) => {
      if (!alive) return;
      setData(d);
      setRunId(d.runs[0]?.id ?? null);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!data || !runId) return;
    let alive = true;
    loadRun(data.source, runId)
      .then((r) => {
        if (alive) setRun(r);
      })
      .catch(() => alive && setError(t("evals.runError")));
    return () => {
      alive = false;
    };
  }, [data, runId, t]);

  const onRun = async () => {
    setRunning(true);
    setError(null);
    try {
      const r = await startRun();
      await refresh(r.id);
    } catch {
      setError(t("evals.runError"));
    } finally {
      setRunning(false);
    }
  };

  const chronological = useMemo(() => [...(data?.runs ?? [])].sort((a, b) => a.createdAt.localeCompare(b.createdAt)), [data]);

  if (!data) return <p className="text-muted">{t("evals.loading")}</p>;

  const s = run?.summary;
  const checkLabel = (id: string) => data.checks.find((c) => c.id === id)?.label[lang] ?? id;
  const runLabel = (createdAt: string) =>
    new Intl.DateTimeFormat(lang === "es" ? "es-ES" : "en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "UTC" }).format(new Date(createdAt)) + " UTC";
  const rate = (id: string) => (s?.checks[id] ? pct(s.checks[id].rate) : "—");
  const selectedResult = run?.results.find((r) => r.caseId === selected) ?? null;
  const checkRows = s
    ? data.checks
        .filter((c) => s.checks[c.id])
        .map((c) => ({ id: c.id, label: c.label[lang], value: s.checks[c.id].rate, detail: `${s.checks[c.id].pass}/${s.checks[c.id].total}` }))
    : [];

  return (
    <>
      <PageHeader title={t("evals.title")} subtitle={t("evals.subtitle")} />

      {/* One filter row above everything it scopes. */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <label className="flex min-w-0 max-w-full items-center gap-2 text-sm font-semibold">
          {t("evals.runPicker")}
          <select className="input w-auto min-w-0 max-w-full py-2" value={runId ?? ""} onChange={(e) => setRunId(e.target.value)} disabled={!data.runs.length}>
            {data.runs.map((r) => (
              <option key={r.id} value={r.id}>
                {runLabel(r.createdAt)} · {t(`evals.mode.${r.mode}`)}
              </option>
            ))}
          </select>
        </label>
        {backendEnabled() && data.source === "backend" && (
          <button type="button" className="btn btn-primary" onClick={onRun} disabled={running}>
            <Play aria-hidden className="size-4" />
            {running ? t("evals.running") : t("evals.run")}
          </button>
        )}
        <span className="rounded-full bg-sand-100 px-3 py-1 text-xs font-semibold text-muted">
          {t(data.source === "backend" ? "evals.source.backend" : "evals.source.snapshot")}
        </span>
      </div>
      {error && (
        <p role="alert" className="mb-4 rounded-xl bg-fit-none-bg px-4 py-2 text-sm font-semibold text-fit-none">
          {error}
        </p>
      )}

      {!data.runs.length && <p className="card p-8 text-center text-muted">{t("evals.noRuns")}</p>}

      {s && run && (
        <div className={`space-y-10 transition-opacity ${running ? "opacity-60" : ""}`}>
          <section aria-label={t("evals.casesPassed")} className="grid gap-4 lg:grid-cols-[minmax(0,16rem)_1fr]">
            <div className="card flex flex-col justify-center p-5">
              <p className="text-sm text-muted">{t("evals.casesPassed")}</p>
              <p className="mt-1 text-6xl font-semibold leading-none text-ink">
                {s.passed}
                <span className="text-3xl text-muted"> / {s.cases}</span>
              </p>
              <p className="mt-2 text-xs text-muted">
                {run.mode === "claude" ? `${t("evals.mode.claude")} · ${run.model}` : t("evals.mode.rules")} · {runLabel(run.createdAt)}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <StatTile label={t("evals.safety")} value={rate("safety")} detail={checkLabel("safety")} />
              <StatTile label={t("evals.constraints")} value={rate("constraints")} detail={s.checks.constraints ? `${s.checks.constraints.pass}/${s.checks.constraints.total}` : undefined} />
              <StatTile label={t("evals.relevance")} value={rate("relevance")} detail={s.checks.relevance ? `${s.checks.relevance.pass}/${s.checks.relevance.total}` : undefined} />
              <StatTile label={t("evals.latency")} value={`${s.latencyMs.mean} ms`} detail={t("evals.latencyP95", { ms: s.latencyMs.p95 })} />
              <StatTile label={t("evals.claude")} value={compact(s.tokens)} detail={t("evals.claudeDetail", { calls: s.claudeCalls, tokens: compact(s.tokens) })} />
              <StatTile label={t("evals.travelersTitle")} value={String(data.cases.length)} detail={`${Object.values(s.checks).reduce((n, c) => n + c.total, 0)} ${t("evals.findings").toLowerCase()}`} />
            </div>
          </section>

          <div className="grid items-start gap-6 xl:grid-cols-2">
            <section aria-labelledby="checks-title" className="card p-5">
              <div className="mb-1 flex items-start justify-between gap-2">
                <h2 id="checks-title" className="font-bold">
                  {t("evals.checksTitle")}
                </h2>
                <ViewToggle table={checksAsTable} onToggle={() => setChecksAsTable((v) => !v)} />
              </div>
              <p className="mb-4 text-xs text-muted">{t("evals.checksNote")}</p>
              {checksAsTable ? (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-muted">
                      <th scope="col" className="pb-2">{t("evals.col.check")}</th>
                      <th scope="col" className="pb-2 text-right">{t("evals.col.passed")}</th>
                      <th scope="col" className="pb-2 text-right">{t("evals.col.rate")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {checkRows.map((r) => (
                      <tr key={r.id}>
                        <th scope="row" className="py-1.5 text-left font-medium">{r.label}</th>
                        <td className="py-1.5 text-right tabular-nums">{r.detail}</td>
                        <td className="py-1.5 text-right tabular-nums">{pct(r.value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <RateBars rows={checkRows} formatValue={pct} />
              )}
            </section>

            <section aria-labelledby="trend-title" className="card p-5">
              <div className="mb-4 flex items-start justify-between gap-2">
                <h2 id="trend-title" className="font-bold">
                  {t("evals.trendTitle")}
                </h2>
                {chronological.length >= 2 && <ViewToggle table={trendAsTable} onToggle={() => setTrendAsTable((v) => !v)} />}
              </div>
              {chronological.length < 2 ? (
                <p className="rounded-xl bg-sand-50 p-6 text-center text-sm text-muted">{t("evals.trendNeedsRuns")}</p>
              ) : trendAsTable ? (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-muted">
                      <th scope="col" className="pb-2">{t("evals.col.date")}</th>
                      <th scope="col" className="pb-2">{t("evals.col.mode")}</th>
                      <th scope="col" className="pb-2 text-right">{t("evals.col.passed")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {chronological.map((r) => (
                      <tr key={r.id}>
                        <th scope="row" className="py-1.5 text-left font-medium">{runLabel(r.createdAt)}</th>
                        <td className="py-1.5">{t(`evals.mode.${r.mode}`)}</td>
                        <td className="py-1.5 text-right tabular-nums">
                          {r.summary.passed}/{r.summary.cases}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <TrendLine
                  ariaLabel={t("evals.trendTitle")}
                  formatValue={pct}
                  points={chronological.map((r) => ({ key: r.id, label: runLabel(r.createdAt), value: r.summary.passed / Math.max(1, r.summary.cases) }))}
                />
              )}
            </section>
          </div>

          <section aria-labelledby="travelers-title">
            <SectionTitle id="travelers-title">{t("evals.travelersTitle")}</SectionTitle>
            <p className="-mt-2 mb-4 text-sm text-muted">{t("evals.travelersNote")}</p>
            <div className={`grid gap-6 ${selectedResult ? "2xl:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]" : ""}`}>
              {/* relative: keeps the absolutely-positioned sr-only header labels inside the scroll box. */}
              <div className="relative overflow-x-auto rounded-2xl border border-line bg-white">
                <table className="w-full min-w-[760px] text-sm">
                  <thead>
                    <tr className="border-b border-line align-bottom">
                      <th scope="col" className="p-3 text-left text-xs uppercase tracking-wide text-muted">{t("evals.col.traveler")}</th>
                      {data.checks.map((c) => (
                        <th key={c.id} scope="col" className="p-2 text-center text-xs font-semibold leading-tight text-muted" title={c.label[lang]}>
                          <span aria-hidden>{t(`evals.short.${c.id}` as MessageKey)}</span>
                          <span className="sr-only">{c.label[lang]}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {run.results.map((r) => {
                      const kase = data.cases.find((c) => c.id === r.caseId);
                      const isSel = selected === r.caseId;
                      return (
                        <tr key={r.caseId} className={isSel ? "bg-lagoon-50" : "hover:bg-sand-50"}>
                          <th scope="row" className="p-3 text-left font-normal">
                            <button type="button" onClick={() => setSelected(isSel ? null : r.caseId)} aria-pressed={isSel} className="text-left">
                              <span className="flex items-center gap-2 font-semibold">
                                {r.passed ? <CircleCheck aria-hidden className="size-4 text-fit-strong" /> : <CircleX aria-hidden className="size-4 text-fit-none" />}
                                {r.name}
                                <span className="sr-only">{t(r.passed ? "evals.outcome.pass" : "evals.outcome.fail")}</span>
                              </span>
                              <span className="block text-xs text-muted">{kase?.tags.join(" · ")}</span>
                            </button>
                          </th>
                          {data.checks.map((c) => {
                            const res = r.checks.find((x) => x.id === c.id);
                            return (
                              <td key={c.id} className="p-2 text-center" title={res?.detail || undefined}>
                                <span className="inline-flex justify-center">
                                  <OutcomeIcon outcome={res?.outcome ?? "n/a"} />
                                </span>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {selectedResult && <CaseDetail result={selectedResult} data={data} />}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
