"""The evaluation suite: it must pass today, and each check must catch the failure it exists for."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

import juni.graph
from juni.agents.application import Application
from juni.api import create_app
from juni.evals.runner import load_cases, run_suite


def failed_checks(run, case_id: str) -> set[str]:
    r = next(r for r in run.results if r.case_id == case_id)
    return {c.id for c in r.checks if c.outcome == "fail"}


def test_suite_passes_with_rule_based_agents(catalog, offline_claude):
    run = run_suite(catalog, offline_claude)
    assert run.mode == "rules"
    failures = {r.case_id: failed_checks(run, r.case_id) for r in run.results if not r.passed}
    assert not failures
    assert run.summary["checks"]["safety"]["rate"] == 1.0


def test_cases_cover_the_brief():
    cases = load_cases()
    assert len(cases) >= 10
    assert any(c.profile.lang == "es" for c in cases)
    assert any(c.focus_program_id for c in cases)
    assert {"safety", "accessibility", "visa", "follow-up"} <= {t for c in cases for t in c.tags}


def test_summer_school_is_not_a_season(catalog):
    from juni.agents.planner import rule_extract

    assert rule_extract("Philosophy summer school in Athens in June", catalog).start_months == [5]
    assert rule_extract("Escuela de verano de filosofía en junio", catalog).start_months == [5]
    assert rule_extract("Something this summer", catalog).start_months == [5, 6, 7]


# ───────────── mutation tests: break an agent, the right check must fail ─────────────


def test_safety_check_catches_a_recommended_risky_school(catalog, offline_claude, monkeypatch):
    real = juni.graph.evaluate_program

    def leaky(cat, p, req, profile):
        r = real(cat, p, req, profile)
        if p.id.startswith("risk-"):
            return r.model_copy(update={"status": "strong", "score": 99.0})
        return r

    monkeypatch.setattr(juni.graph, "evaluate_program", leaky)
    run = run_suite(catalog, offline_claude, [c for c in load_cases() if c.id == "spanish-food-canonical"])
    assert "safety" in failed_checks(run, "spanish-food-canonical")


def test_constraints_check_catches_an_over_budget_strong_fit(catalog, offline_claude, monkeypatch):
    real = juni.graph.evaluate_program

    def generous(cat, p, req, profile):
        r = real(cat, p, req, profile)
        if r.status == "none" and not r.risk_flags:
            return r.model_copy(update={"status": "strong", "score": 50.0})
        return r

    monkeypatch.setattr(juni.graph, "evaluate_program", generous)
    run = run_suite(catalog, offline_claude, [c for c in load_cases() if c.id == "budget-spanish-student"])
    assert "constraints" in failed_checks(run, "budget-spanish-student")


def test_approval_gate_check_catches_drafting_without_approval(catalog, offline_claude, monkeypatch):
    real = Application.draft_inquiry

    def eager(self, proposal, profile, req):
        return real(self, proposal.model_copy(update={"status": "approved"}), profile, req)

    monkeypatch.setattr(Application, "draft_inquiry", eager)
    run = run_suite(catalog, offline_claude, [c for c in load_cases() if c.id == "budget-spanish-student"])
    assert "approval_gate" in failed_checks(run, "budget-spanish-student")


def test_follow_up_check_catches_a_planner_that_never_asks(catalog, offline_claude, monkeypatch):
    from juni.agents import planner

    real = planner.rule_extract

    def impatient(text, cat):
        ex = real(text, cat)
        ex.skip_questions = True
        return ex

    monkeypatch.setattr(planner, "rule_extract", impatient)
    run = run_suite(catalog, offline_claude, [c for c in load_cases() if c.id == "follow-up-italy"])
    assert "follow_up" in failed_checks(run, "follow-up-italy")


# ───────────── API ─────────────


@pytest.fixture
def api(settings, offline_claude):
    with TestClient(create_app(settings, offline_claude)) as c:
        yield c


def test_eval_api_runs_stores_and_lists(api):
    assert len(api.get("/evals/cases").json()["cases"]) == len(load_cases())
    created = api.post("/evals/runs").json()
    assert created["summary"]["passed"] == created["summary"]["cases"]
    runs = api.get("/evals/runs").json()["runs"]
    assert runs[0]["id"] == created["id"] and "results" not in runs[0]
    full = api.get(f"/evals/runs/{created['id']}").json()
    assert len(full["results"]) == len(load_cases())
    assert api.get("/evals/runs/run-missing").status_code == 404
