"""The Juni agent graph (LangGraph).

    START ─┬─ focus ───────────────────────────────────────────────▶ END   ("Ask Juni about this program")
           └─ planner ─┬─ ask / reset / compare / draft / question ──▶ END
                       └─ scout ─▶ verifier ─▶ logistics ─▶ fit ─▶ respond ─▶ END

Each turn runs the graph once. Shared state (the structured request, questions
already asked, last shortlist, pending proposals) is persisted per chat session
by the API layer, so the graph itself is stateless and easy to test.
"""

from __future__ import annotations

from typing import Any, TypedDict

from langgraph.graph import END, START, StateGraph

from .agents.application import new_proposal
from .agents.logistics import Logistics
from .agents.planner import Planner, PlannerOutput
from .agents.scout import Scout
from .agents.verifier import Verifier
from .catalog import Catalog
from .fit import evaluate_program, rank
from .fmt import money, month_name
from .llm import Claude
from .models import (
    ActionProposal,
    AgentStep,
    Chip,
    ChipsPart,
    ComparePart,
    CostPart,
    FitResult,
    L,
    MissingField,
    Profile,
    ProposalPart,
    ResultsPart,
    SharedState,
    StepsPart,
    TextPart,
    TravelRequest,
    WebFinding,
    WebFindingsPart,
)


class TurnState(TypedDict, total=False):
    # inputs
    message: str
    focus_program_id: str | None
    profile: Profile
    past_program_ids: list[str]
    shared: SharedState
    # working state
    plan: PlannerOutput
    candidates: list[str]
    web: list[WebFinding]
    verified_count: int
    risk_count: int
    results: list[FitResult]
    # outputs
    parts: list[Any]
    proposals: list[ActionProposal]


FOLLOW_UPS: dict[MissingField, tuple[L, list[Chip]]] = {
    "dates": (
        L(en="When would you like to go, and for how long?", es="¿Cuándo te gustaría ir y por cuánto tiempo?"),
        [
            Chip(label=L(en="2 weeks in July", es="2 semanas en julio"), value=L(en="2 weeks in July", es="2 semanas en julio")),
            Chip(label=L(en="This winter", es="Este invierno"), value=L(en="winter", es="invierno")),
            Chip(label=L(en="Spring 2027", es="Primavera 2027"), value=L(en="spring", es="primavera")),
            Chip(label=L(en="I'm flexible", es="Soy flexible"), value=L(en="I'm flexible on dates", es="Soy flexible con las fechas")),
        ],
    ),
    "budget": (
        L(en="What's your total budget, not counting flights?", es="¿Cuál es tu presupuesto total, sin contar vuelos?"),
        [
            Chip(label=L(en="Under $1,500", es="Menos de $1,500"), value=L.same("$1,500")),
            Chip(label=L(en="Around $2,500", es="Unos $2,500"), value=L.same("$2,500")),
            Chip(label=L(en="Up to $4,000", es="Hasta $4,000"), value=L.same("$4,000")),
        ],
    ),
    "passport": (
        L(en="Which country issued your passport? (Country only — I never need ID numbers.)",
          es="¿Qué país emitió tu pasaporte? (Solo el país: nunca necesito números de documento.)"),
        [],
    ),
    "level": (
        L(en="What's your current level in the language?", es="¿Cuál es tu nivel actual del idioma?"),
        [
            Chip(label=L(en="Beginner (A1–A2)", es="Principiante (A1–A2)"), value=L(en="beginner", es="principiante")),
            Chip(label=L(en="Intermediate (B1–B2)", es="Intermedio (B1–B2)"), value=L(en="intermediate", es="intermedio")),
            Chip(label=L(en="Advanced (C1+)", es="Avanzado (C1+)"), value=L(en="advanced", es="avanzado")),
        ],
    ),
}


def text(en: str, es: str) -> TextPart:
    return TextPart(text=L(en=en, es=es))


class JuniGraph:
    def __init__(self, cat: Catalog, claude: Claude):
        self.cat = cat
        self.claude = claude
        self.planner = Planner(cat, claude)
        self.scout = Scout(cat, claude)
        self.verifier = Verifier(cat)
        self.logistics = Logistics(cat)
        self.graph = self._build()

    # ───────────── helpers ─────────────

    def describe(self, r: TravelRequest) -> L:
        en: list[str] = []
        es: list[str] = []
        if r.weeks:
            en.append(f"{r.weeks} week{'s' if r.weeks > 1 else ''}")
            es.append(f"{r.weeks} semana{'s' if r.weeks > 1 else ''}")
        if r.months:
            en.append("/".join(month_name(m, "en") for m in r.months))
            es.append("/".join(month_name(m, "es") for m in r.months))
        if r.budget:
            en.append(f"up to {money(r.budget, 'en')}")
            es.append(f"hasta {money(r.budget, 'es')}")
        if r.categories:
            names = [self.cat.category_name(c) for c in r.categories]
            en.append(" + ".join(n[0] for n in names))
            es.append(" + ".join(n[1] for n in names))
        if r.destinations and len(r.destinations) <= 3:
            names = ", ".join(self.cat.destinations[d].name for d in r.destinations)
            en.append(f"in {names}")
            es.append(f"en {names}")
        return L(en=" · ".join(en), es=" · ".join(es))

    # ───────────── nodes ─────────────

    def node_planner(self, s: TurnState) -> TurnState:
        plan = self.planner.plan(s["message"], s["shared"], s["profile"], s.get("past_program_ids", []))
        return {"plan": plan}

    def route(self, s: TurnState) -> str:
        return s["plan"].next

    def node_reset(self, s: TurnState) -> TurnState:
        return {
            "shared": SharedState(),
            "parts": [text("Fresh start! What would you like to learn, and where?", "¡Empecemos de nuevo! ¿Qué te gustaría aprender y dónde?")],
        }

    def node_ask(self, s: TurnState) -> TurnState:
        plan = s["plan"]
        shared = s["shared"].model_copy(update={"request": plan.request})
        if not (plan.request.categories or plan.request.destinations):
            return {"shared": shared, "parts": [text(
                "I'd love to help! Tell me what you'd like to learn (a language, cooking, art…), roughly when, and your budget — or tap a suggestion.",
                "¡Me encantaría ayudarte! Cuéntame qué te gustaría aprender (un idioma, cocina, arte…), más o menos cuándo y tu presupuesto, o elige una sugerencia.",
            )]}
        field = plan.missing[0]
        question, chips = FOLLOW_UPS[field]
        summary = self.describe(plan.request)
        chips = [*chips, Chip(label=L(en="Just show me options", es="Solo muéstrame opciones"),
                              value=L(en="Just show me options", es="Muéstrame opciones"))]
        shared.asked = [*shared.asked, field]
        return {"shared": shared, "parts": [
            text(f"Great — {summary.en or 'let’s find something'}. One quick question so I don't guess:",
                 f"Genial: {summary.es or 'busquemos algo'}. Una pregunta rápida para no adivinar:"),
            TextPart(text=question),
            ChipsPart(chips=chips),
        ]}

    def node_compare(self, s: TurnState) -> TurnState:
        shared, profile = s["shared"], s["profile"]
        results = [evaluate_program(self.cat, self.cat.programs[i], shared.request, profile) for i in shared.last_results[:3]]
        return {"parts": [text("Here's a side-by-side of your top options:", "Aquí tienes una comparación de tus mejores opciones:"),
                          ComparePart(results=results)]}

    def node_draft(self, s: TurnState) -> TurnState:
        prop = new_proposal(self.cat, s["shared"].last_results[0], s["profile"])
        return {"proposals": [prop], "parts": [
            text("I can draft an inquiry for your top pick. Nothing is sent — review the plan first:",
                 "Puedo redactar una consulta para tu mejor opción. No se envía nada; revisa el plan primero:"),
            ProposalPart(proposal=prop),
        ]}

    def node_question(self, s: TurnState) -> TurnState:
        lang = s["profile"].lang
        answer = self.claude.text(
            system=(
                "You are Juni, a warm, knowledgeable and honest advisor for short learning trips abroad (1-8 weeks). "
                f"Answer in {'Spanish' if lang == 'es' else 'English'} in under 120 words. Be concrete and practical. "
                "Never claim to book, pay or contact anyone. For visas, always say to confirm with the official embassy or "
                "consulate. If you don't know, say so. End by offering to find matching programs."
            ),
            user=s["message"],
        )
        if answer:
            return {"parts": [TextPart(text=answer)]}
        return {"parts": [text(
            "Good question! I can best help by finding programs for you — tell me what you'd like to learn, when, and your budget.",
            "¡Buena pregunta! Donde más te ayudo es buscando programas: dime qué quieres aprender, cuándo y tu presupuesto.",
        )]}

    def node_scout(self, s: TurnState) -> TurnState:
        req = s["plan"].request
        found = self.scout.find(req)
        web = self.scout.discover(req, self.describe(req).en) if req.categories or req.destinations else []
        return {"candidates": [p.id for p in found], "web": web}

    def node_verifier(self, s: TurnState) -> TurnState:
        records = [self.verifier.verify(self.cat.programs[i]) for i in s["candidates"]]
        return {
            "verified_count": sum(r.status == "verified" for r in records),
            "risk_count": sum(r.status == "risk" for r in records),
            "web": self.verifier.screen_web(s.get("web", [])),
        }

    def node_logistics(self, s: TurnState) -> TurnState:
        # Visa rules and cost estimates are computed per program inside the fit step;
        # this node validates that every candidate has the data Logistics needs.
        cands = [i for i in s["candidates"] if self.cat.programs[i].housing and self.cat.programs[i].sessions]
        return {"candidates": cands}

    def node_fit(self, s: TurnState) -> TurnState:
        req, profile = s["plan"].request, s["profile"]
        return {"results": rank([evaluate_program(self.cat, self.cat.programs[i], req, profile) for i in s["candidates"]])}

    def node_respond(self, s: TurnState) -> TurnState:
        plan, profile, ranked = s["plan"], s["profile"], s["results"]
        req = plan.request
        good = [r for r in ranked if r.status != "none"][:4]
        flagged = [r for r in ranked if r.status == "none" and r.risk_flags][:1]
        misses = [r for r in ranked if r.status == "none" and not r.risk_flags][: (1 if good else 3)]
        strong = sum(r.status == "strong" for r in ranked)
        partial = sum(r.status == "partial" for r in ranked)
        web = s.get("web", [])
        n = len(s["candidates"])
        summary = self.describe(req)

        steps = [
            AgentStep(agent="planner", summary=summary),
            AgentStep(agent="scout", summary=L(
                en=f"Searched {len(self.cat.programs)} programs in Juni's database → {n} candidates" + (f"; found {len(web)} more on the web" if web else ""),
                es=f"Busqué en {len(self.cat.programs)} programas de Juni → {n} candidatos" + (f"; encontré {len(web)} más en la web" if web else ""))),
            AgentStep(agent="verifier", summary=L(
                en=f"Checked {n} schools: {s.get('verified_count', 0)} verified, {s.get('risk_count', 0)} with risk flags",
                es=f"Revisé {n} escuelas: {s.get('verified_count', 0)} verificadas, {s.get('risk_count', 0)} con alertas")),
            AgentStep(agent="logistics", summary=L(
                en="Estimated total trip costs" + (f" and visa rules for a {req.passport} passport" if req.passport else ""),
                es="Calculé costos totales" + (f" y requisitos de visa para pasaporte {req.passport}" if req.passport else ""))),
            AgentStep(agent="fit", summary=L(
                en=f"Ranked: {strong} strong, {partial} partial, {len(ranked) - strong - partial} don't fit",
                es=f"Clasificación: {strong} encajan bien, {partial} en parte, {len(ranked) - strong - partial} no encajan")),
        ]

        parts: list[Any] = []
        if good:
            parts.append(text(f"Here's your shortlist for {summary.en}. Each option shows why it fits, the total estimate and its sources.",
                              f"Esta es tu selección para {summary.es}. Cada opción muestra por qué encaja, el costo total estimado y sus fuentes."))
        else:
            parts.append(text(f"I couldn't find anything that fully fits {summary.en}. Here's what came closest and why — try more flexible dates or a higher budget?",
                              f"No encontré nada que encaje del todo con {summary.es}. Esto es lo más cercano y por qué. ¿Pruebas con fechas más flexibles o más presupuesto?"))
        if plan.assumptions:
            parts.append(text(f"I used: {'; '.join(a.en for a in plan.assumptions)}. Edit these in Profile anytime.",
                              f"Usé: {'; '.join(a.es for a in plan.assumptions)}. Puedes editarlo en tu Perfil."))
        parts.append(StepsPart(steps=steps))
        parts.append(ResultsPart(results=[*good, *misses], flagged=flagged))
        if good:
            parts.append(CostPart(result=good[0]))
        if len(good) >= 2:
            parts.append(ComparePart(results=good[:3]))
        if web:
            parts.append(text("I also found these on the web. They are not verified by Juni yet — treat them as leads and check them yourself:",
                              "También encontré estos en la web. Juni aún no los ha verificado: tómalos como pistas y revísalos tú mismo:"))
            parts.append(WebFindingsPart(findings=web))
        if flagged:
            parts.append(text(
                "⚠️ I also found a listing with scam red flags and left it out of your shortlist. See it above under \"Flagged by Juni\" so you can recognize similar offers.",
                "⚠️ También encontré un anuncio con señales de estafa y lo dejé fuera. Lo verás arriba en \"Marcado por Juni\" para que reconozcas ofertas parecidas."))
        proposals: list[ActionProposal] = []
        if good:
            parts.append(text("Want me to draft an inquiry to your top pick? I'll show you the plan first — nothing is drafted or sent without your approval.",
                              "¿Quieres que redacte una consulta para tu mejor opción? Primero te muestro el plan; no redacto ni envío nada sin tu aprobación."))
            prop = new_proposal(self.cat, good[0].program_id, profile)
            proposals.append(prop)
            parts.append(ProposalPart(proposal=prop))
        shared = SharedState(request=req, asked=s["shared"].asked, last_results=[r.program_id for r in good])
        return {"parts": parts, "shared": shared, "proposals": proposals}

    def node_focus(self, s: TurnState) -> TurnState:
        """'Ask Juni about this program' — an honest review of one listing."""
        pid, profile, shared = s["focus_program_id"], s["profile"], s["shared"]
        p = self.cat.programs.get(pid or "")
        if not p:
            return {"parts": [text("I couldn't find that program.", "No encontré ese programa.")]}
        req = shared.request.model_copy(update={
            "passport": shared.request.passport or profile.passport or None,
            "budget": shared.request.budget or profile.budget_max or None,
        })
        result = evaluate_program(self.cat, p, req, profile)
        school, dest = self.cat.school_of(p), self.cat.destination_of(p)
        if school.verification.status == "risk":
            alts = rank([
                evaluate_program(self.cat, x, req.model_copy(update={"months": []}), profile)
                for x in self.cat.programs.values()
                if x.category == p.category and x.id != p.id and self.cat.school_of(x).verification.status == "verified"
            ])[:2]
            parts: list[Any] = [
                text(f"I'd steer clear of \"{p.title.en}\". {school.name} failed my checks: {', '.join(f.en.lower() for f in result.risk_flags)}. "
                     "Never pay by wire transfer to a school you can't verify.",
                     f"Te recomiendo evitar \"{p.title.es}\". {school.name} no superó mis revisiones: {', '.join(f.es.lower() for f in result.risk_flags)}. "
                     "Nunca pagues por transferencia a una escuela que no puedas verificar."),
                ResultsPart(results=[], flagged=[result]),
            ]
            if alts:
                parts += [text("Verified alternatives in the same category:", "Alternativas verificadas en la misma categoría:"),
                          ResultsPart(results=alts, flagged=[])]
            return {"parts": parts, "shared": shared.model_copy(update={"last_results": [a.program_id for a in alts]})}

        parts = [
            text(f"Here's my honest read on \"{p.title.en}\" at {school.name} in {dest.name}, checked against your profile.",
                 f"Esta es mi opinión honesta sobre \"{p.title.es}\" en {school.name}, {dest.name}, comparado con tu perfil."),
            ResultsPart(results=[result], flagged=[]),
            CostPart(result=result),
        ]
        visa = self.logistics.visa(dest.country_code, req.passport or "")
        if visa:
            parts.append(text(
                f"Visa ({req.passport} passport → {dest.country.en}): {visa.note.en} Confirm with the official embassy or consulate.",
                f"Visa (pasaporte {req.passport} → {dest.country.es}): {visa.note.es} Confírmalo con la embajada o el consulado oficial."))
        prop = new_proposal(self.cat, p.id, profile)
        parts += [text("Want me to draft an inquiry to the school? Review the plan first:",
                       "¿Quieres que redacte una consulta a la escuela? Revisa el plan primero:"),
                  ProposalPart(proposal=prop)]
        return {"parts": parts, "proposals": [prop], "shared": shared.model_copy(update={"request": req, "last_results": [p.id]})}

    # ───────────── graph ─────────────

    def _build(self):
        g = StateGraph(TurnState)
        for name in ("planner", "reset", "ask", "compare", "draft", "question", "scout", "verifier", "logistics", "fit", "respond", "focus"):
            g.add_node(name, getattr(self, f"node_{name}"))
        g.add_conditional_edges(START, lambda s: "focus" if s.get("focus_program_id") else "planner", ["focus", "planner"])
        g.add_conditional_edges("planner", self.route, {
            "reset": "reset", "ask": "ask", "compare": "compare", "draft": "draft", "question": "question", "search": "scout",
        })
        g.add_edge("scout", "verifier")
        g.add_edge("verifier", "logistics")
        g.add_edge("logistics", "fit")
        g.add_edge("fit", "respond")
        for terminal in ("reset", "ask", "compare", "draft", "question", "respond", "focus"):
            g.add_edge(terminal, END)
        return g.compile()

    def run(self, *, message: str, profile: Profile, shared: SharedState, past_program_ids: list[str] | None = None,
            focus_program_id: str | None = None) -> TurnState:
        out = self.graph.invoke({
            "message": message,
            "profile": profile,
            "shared": shared,
            "past_program_ids": past_program_ids or [],
            "focus_program_id": focus_program_id,
            "parts": [],
            "proposals": [],
        })
        return out
