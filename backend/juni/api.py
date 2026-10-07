"""HTTP API for the Juni front-end."""

from __future__ import annotations

import logging
import re
from contextlib import asynccontextmanager
from typing import Literal

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import Field
from sqlalchemy.orm import Session, sessionmaker

from .agents.application import Application
from .catalog import Catalog
from .config import Settings, get_settings
from .db import AgentMessageRow, ChatSessionRow, init_db, make_engine
from .evals.runner import check_catalog, load_cases, run_suite
from .evals.store import get_run, list_runs, save_run
from .graph import JuniGraph
from .llm import Claude
from .models import ActionProposal, AgentStep, DraftPart, L, Profile, SharedState, StepsPart, TextPart, Wire

log = logging.getLogger(__name__)

PASSPORT_RE = re.compile(r"^(?:[A-Z]{2})$")


class MessageIn(Wire):
    text: str = Field("", max_length=2000)
    focus_program_id: str | None = None
    profile: Profile = Field(default_factory=Profile)
    past_program_ids: list[str] = []


class DecisionIn(Wire):
    decision: Literal["approve", "reject"]
    questions: list[str] | None = Field(None, max_length=12)
    profile: Profile = Field(default_factory=Profile)


def dump(parts: list) -> list[dict]:
    return [p.model_dump(by_alias=True, mode="json", exclude_none=False) for p in parts]


def sanitize_profile(p: Profile) -> Profile:
    # Juni only ever stores the passport *country*; anything else (e.g. a document number) is dropped.
    passport = p.passport.strip().upper()
    return p.model_copy(update={"passport": passport if PASSPORT_RE.match(passport) else ""})


def create_app(settings: Settings | None = None, claude: Claude | None = None) -> FastAPI:
    settings = settings or get_settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        engine = make_engine(settings.database_url)
        factory = init_db(engine)
        cat = Catalog.load(factory)
        llm = claude or Claude(settings)
        app.state.factory = factory
        app.state.catalog = cat
        app.state.claude = llm
        app.state.graph = JuniGraph(cat, llm)
        app.state.application = Application(cat, llm)
        log.info("Juni API ready: %d programs, Claude %s", len(cat.programs), "on" if llm.enabled else "off (rule-based fallback)")
        yield
        engine.dispose()

    app = FastAPI(title="Juni API", version="0.2.0", lifespan=lifespan)
    app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins, allow_methods=["*"], allow_headers=["*"])

    def db(request: Request):
        factory: sessionmaker[Session] = request.app.state.factory
        with factory() as s:
            yield s

    def catalog(request: Request) -> Catalog:
        return request.app.state.catalog

    def load_session(s: Session, session_id: str) -> ChatSessionRow:
        row = s.get(ChatSessionRow, session_id)
        if row is None:
            raise HTTPException(404, "Chat session not found")
        return row

    # ───────────── health ─────────────

    @app.get("/health")
    def health(request: Request):
        llm: Claude = request.app.state.claude
        return {"status": "ok", "llm": llm.enabled, "webSearch": llm.enabled and settings.web_search, "model": settings.model}

    # ───────────── chat ─────────────

    @app.post("/chat/sessions", status_code=201)
    def create_session(s: Session = Depends(db)):
        row = ChatSessionRow(shared_state={"state": SharedState().model_dump(by_alias=True), "proposals": {}})
        s.add(row)
        s.commit()
        return {"sessionId": row.id}

    @app.get("/chat/sessions/{session_id}/messages")
    def list_messages(session_id: str, s: Session = Depends(db)):
        load_session(s, session_id)
        rows = s.query(AgentMessageRow).filter_by(session_id=session_id).order_by(AgentMessageRow.id).all()
        return {"messages": [{"id": str(r.id), "role": r.role, "parts": r.parts} for r in rows]}

    @app.post("/chat/sessions/{session_id}/messages")
    def send_message(session_id: str, body: MessageIn, request: Request, s: Session = Depends(db)):
        if not body.text.strip() and not body.focus_program_id:
            raise HTTPException(422, "Send text or a focusProgramId")
        row = load_session(s, session_id)
        saved = row.shared_state or {}
        shared = SharedState.model_validate(saved.get("state", {}))
        proposals: dict = dict(saved.get("proposals", {}))
        graph: JuniGraph = request.app.state.graph

        out = graph.run(
            message=body.text.strip(),
            profile=sanitize_profile(body.profile),
            shared=shared,
            past_program_ids=body.past_program_ids,
            focus_program_id=body.focus_program_id,
        )
        for p in out.get("proposals", []):
            proposals[p.id] = p.model_dump(by_alias=True)
        new_shared: SharedState = out.get("shared", shared)
        row.shared_state = {"state": new_shared.model_dump(by_alias=True, mode="json"), "proposals": proposals}
        parts = dump(out.get("parts", []))
        if body.text.strip():
            s.add(AgentMessageRow(session_id=session_id, role="user", parts=[{"type": "text", "text": body.text.strip()}]))
        s.add(AgentMessageRow(session_id=session_id, role="juni", parts=parts))
        s.commit()
        return {"parts": parts}

    @app.post("/chat/sessions/{session_id}/proposals/{proposal_id}")
    def decide(session_id: str, proposal_id: str, body: DecisionIn, request: Request, s: Session = Depends(db)):
        row = load_session(s, session_id)
        saved = dict(row.shared_state or {})
        proposals = dict(saved.get("proposals", {}))
        if proposal_id not in proposals:
            raise HTTPException(404, "Unknown proposal")
        prop = ActionProposal.model_validate(proposals[proposal_id])
        if prop.status != "pending":
            raise HTTPException(409, f"Proposal already {prop.status}")

        if body.decision == "reject":
            prop.status = "rejected"
            parts = [TextPart(text=L(en="No problem — I won't draft anything. Want to refine the search or compare options?",
                                     es="Sin problema, no redactaré nada. ¿Quieres afinar la búsqueda o comparar opciones?"))]
            draft = None
        else:
            questions = [q.strip()[:300] for q in body.questions or prop.questions if q.strip()]
            prop = prop.model_copy(update={"status": "approved", "questions": questions or prop.questions})
            application: Application = request.app.state.application
            shared = SharedState.model_validate(saved.get("state", {}))
            draft = application.draft_inquiry(prop, sanitize_profile(body.profile), shared.request)
            school = request.app.state.catalog.school_of(request.app.state.catalog.programs[prop.program_id])
            parts = [
                StepsPart(steps=[AgentStep(agent="application", summary=L(en=f"Drafted an inquiry to {school.name}. Not sent.",
                                                                          es=f"Redacté una consulta para {school.name}. No enviada."))]),
                TextPart(text=L(
                    en="Here's your draft. I saved it to My Trips. I haven't sent it — copy it or open it in your own email app when you're ready.",
                    es="Aquí tienes tu borrador. Lo guardé en Mis viajes. No lo he enviado: cópialo o ábrelo en tu propia app de correo cuando quieras.")),
                DraftPart(draft=draft, program_id=prop.program_id),
            ]
        proposals[proposal_id] = prop.model_dump(by_alias=True)
        saved["proposals"] = proposals
        row.shared_state = saved
        dumped = dump(parts)
        s.add(AgentMessageRow(session_id=session_id, role="juni", parts=dumped))
        s.commit()
        return {"proposal": prop.model_dump(by_alias=True), "parts": dumped,
                "draft": draft.model_dump(by_alias=True) if draft else None}

    # ───────────── evaluation (Phase 3) ─────────────

    @app.get("/evals/cases")
    def eval_cases():
        return {"cases": [c.model_dump(by_alias=True) for c in load_cases()], "checks": check_catalog()}

    @app.get("/evals/runs")
    def eval_runs(request: Request):
        return {"runs": list_runs(request.app.state.factory)}

    @app.get("/evals/runs/{run_id}")
    def eval_run(run_id: str, request: Request):
        run = get_run(request.app.state.factory, run_id)
        if run is None:
            raise HTTPException(404, "Evaluation run not found")
        return run

    @app.post("/evals/runs", status_code=201)
    def start_eval_run(request: Request):
        # Runs synchronously: a few ms per turn with rule-based agents, minutes when Claude is on.
        run = run_suite(request.app.state.catalog, request.app.state.claude)
        save_run(request.app.state.factory, run)
        return run.model_dump(by_alias=True, mode="json")

    # ───────────── catalog ─────────────

    @app.get("/programs")
    def list_programs(category: str | None = None, destination: str | None = None, cat: Catalog = Depends(catalog)):
        items = [p for p in cat.programs.values()
                 if (not category or p.category == category) and (not destination or p.destination_id == destination)]
        return {"programs": [p.model_dump(by_alias=True) for p in items]}

    @app.get("/programs/{program_id}")
    def get_program(program_id: str, cat: Catalog = Depends(catalog)):
        p = cat.programs.get(program_id)
        if not p:
            raise HTTPException(404, "Program not found")
        return {
            "program": p.model_dump(by_alias=True),
            "school": cat.school_of(p).model_dump(by_alias=True),
            "reviews": [r.model_dump(by_alias=True) for r in cat.reviews if r.program_id == p.id],
        }

    @app.get("/destinations")
    def list_destinations(cat: Catalog = Depends(catalog)):
        return {"destinations": [d.model_dump(by_alias=True) for d in cat.destinations.values()]}

    @app.get("/destinations/{destination_id}/visa")
    def visa(destination_id: str, passport: str, cat: Catalog = Depends(catalog)):
        d = cat.destinations.get(destination_id)
        if not d:
            raise HTTPException(404, "Destination not found")
        rule = cat.visa(d.country_code, passport.upper())
        return {"rule": rule.model_dump(by_alias=True) if rule else None, "lastChecked": cat.visa_last_checked,
                "disclaimer": "Confirm with the official embassy or consulate."}

    return app
