// Phase 3 evaluation types and data access. Mirrors backend/juni/evals/runner.py.

import snapshot from "@/data/eval-snapshot.json";
import { API_URL, backendEnabled } from "./api";
import type { L, Profile } from "./types";

export type Outcome = "pass" | "fail" | "n/a";

export interface EvalCase {
  id: string;
  name: string;
  persona: L;
  tags: string[];
  profile: Profile;
  turns: string[];
  focusProgramId: string | null;
  expect: Record<string, unknown>;
}

export interface EvalCheck {
  id: string;
  label: L;
}

export interface CheckResult {
  id: string;
  outcome: Outcome;
  detail: string;
}

export interface TurnLog {
  user: string;
  reply: string;
  recommended: string[];
  flagged: string[];
  asked: string | null;
  latencyMs: number;
}

export interface CaseResult {
  caseId: string;
  name: string;
  passed: boolean;
  checks: CheckResult[];
  turns: TurnLog[];
  claudeCalls: number;
  tokens: number;
}

export interface EvalSummary {
  cases: number;
  passed: number;
  checks: Record<string, { pass: number; total: number; rate: number }>;
  latencyMs: { mean: number; p95: number };
  claudeCalls: number;
  tokens: number;
}

export interface EvalRunSummary {
  id: string;
  createdAt: string;
  mode: "claude" | "rules";
  model: string;
  summary: EvalSummary;
}

export interface EvalRun extends EvalRunSummary {
  results: CaseResult[];
}

export interface EvalData {
  source: "backend" | "snapshot";
  cases: EvalCase[];
  checks: EvalCheck[];
  runs: EvalRunSummary[];
}

const snap = snapshot as unknown as { cases: EvalCase[]; checks: EvalCheck[]; runs: EvalRun[] };

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`);
  if (!res.ok) throw new Error(`Juni API ${res.status}`);
  return (await res.json()) as T;
}

/** Loads cases and run history from the backend, or the bundled snapshot when there is no backend. */
export async function loadEvalData(): Promise<EvalData> {
  if (backendEnabled()) {
    try {
      const [{ cases, checks }, { runs }] = await Promise.all([
        get<{ cases: EvalCase[]; checks: EvalCheck[] }>("/evals/cases"),
        get<{ runs: EvalRunSummary[] }>("/evals/runs"),
      ]);
      return { source: "backend", cases, checks, runs };
    } catch (err) {
      console.error(err);
    }
  }
  return { source: "snapshot", cases: snap.cases, checks: snap.checks, runs: snap.runs };
}

export async function loadRun(source: EvalData["source"], id: string): Promise<EvalRun> {
  if (source === "backend") return get<EvalRun>(`/evals/runs/${id}`);
  const run = snap.runs.find((r) => r.id === id);
  if (!run) throw new Error(`Unknown run ${id}`);
  return run;
}

export async function startRun(): Promise<EvalRun> {
  const res = await fetch(`${API_URL}/evals/runs`, { method: "POST" });
  if (!res.ok) throw new Error(`Juni API ${res.status}`);
  return (await res.json()) as EvalRun;
}
