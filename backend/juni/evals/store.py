"""Persists evaluation runs so the dashboard can show history and trends."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session, sessionmaker

from ..db import EvalRunRow
from .runner import EvalRun


def save_run(factory: sessionmaker[Session], run: EvalRun) -> None:
    with factory() as s:
        s.add(EvalRunRow(id=run.id, created_at=run.created_at, mode=run.mode, model=run.model,
                         data=run.model_dump(by_alias=True, mode="json")))
        s.commit()


def list_runs(factory: sessionmaker[Session], limit: int = 50) -> list[dict]:
    """Newest first, summaries only."""
    with factory() as s:
        rows = s.scalars(select(EvalRunRow).order_by(EvalRunRow.created_at.desc()).limit(limit)).all()
        return [{k: r.data[k] for k in ("id", "createdAt", "mode", "model", "summary")} for r in rows]


def get_run(factory: sessionmaker[Session], run_id: str) -> dict | None:
    with factory() as s:
        row = s.get(EvalRunRow, run_id)
        return row.data if row else None
