"""Run the evaluation suite from the command line.

    uv run python -m juni.evals                 # print a summary
    uv run python -m juni.evals --save          # also store the run in the database (shows on the dashboard)
    uv run python -m juni.evals --out run.json  # write the full run as JSON
    uv run python -m juni.evals --min-pass 1.0  # exit non-zero if the case pass rate is below the bar
    uv run python -m juni.evals --snapshot ../src/data/eval-snapshot.json
                                                # bundle cases + this run for the dashboard's offline mode
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from ..catalog import Catalog
from ..config import get_settings
from ..db import init_db, make_engine
from ..llm import Claude
from .runner import check_catalog, load_cases, run_suite
from .store import save_run


def main() -> int:
    ap = argparse.ArgumentParser(prog="python -m juni.evals")
    ap.add_argument("--save", action="store_true", help="store the run in the database")
    ap.add_argument("--out", type=Path, help="write the full run to this JSON file")
    ap.add_argument("--snapshot", type=Path, help="write cases, checks and this run for the front-end's offline dashboard")
    ap.add_argument("--min-pass", type=float, default=None, help="fail if the case pass rate is below this (0-1)")
    args = ap.parse_args()

    settings = get_settings()
    factory = init_db(make_engine(settings.database_url))
    run = run_suite(Catalog.load(factory), Claude(settings))
    s = run.summary

    print(f"Juni eval {run.id} · mode={run.mode} · model={run.model}")
    print(f"Cases passed: {s['passed']}/{s['cases']}")
    for cid, c in s["checks"].items():
        print(f"  {cid:<14} {c['pass']:>2}/{c['total']:<2} {c['rate'] * 100:5.1f}%")
    print(f"Latency mean {s['latencyMs']['mean']} ms · p95 {s['latencyMs']['p95']} ms · Claude calls {s['claudeCalls']} · tokens {s['tokens']}")
    for r in run.results:
        if not r.passed:
            fails = "; ".join(f"{c.id}: {c.detail}" for c in r.checks if c.outcome == "fail")
            print(f"  ✗ {r.case_id} — {fails}")

    if args.out:
        args.out.write_text(json.dumps(run.model_dump(by_alias=True, mode="json"), indent=1, ensure_ascii=False) + "\n")
    if args.snapshot:
        snap = {
            "cases": [c.model_dump(by_alias=True) for c in load_cases()],
            "checks": check_catalog(),
            "runs": [run.model_dump(by_alias=True, mode="json")],
        }
        args.snapshot.write_text(json.dumps(snap, indent=1, ensure_ascii=False) + "\n")
    if args.save:
        save_run(factory, run)
    if args.min_pass is not None and s["passed"] / max(1, s["cases"]) < args.min_pass:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
