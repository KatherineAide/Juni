"""Planner (orchestrator): understands the message, keeps shared state, decides what happens next."""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Literal

from pydantic import BaseModel, Field

from ..catalog import Catalog
from ..fit import cefr_to_level
from ..fmt import money
from ..llm import Claude
from ..models import L, MissingField, Profile, SharedState, TravelRequest

Intent = Literal["search", "compare", "draft", "reset", "question", "next"]
Next = Literal["ask", "search", "compare", "draft", "reset", "question"]


class Extraction(BaseModel):
    """What Claude extracts from one user message (only what the message itself says)."""

    intent: Intent = Field(description="search: find/refine programs (also answers to Juni's questions). compare: compare the current shortlist. "
                                       "draft: write to a school about the current top pick. reset: start over. "
                                       "question: a general question about learning abroad. next: plan the next trip from past experiences.")
    budget_usd: int | None = Field(None, description="Total budget in USD excluding flights, if stated")
    start_months: list[int] | None = Field(None, description="0-based months the user can start (July = 6); seasons expand to 3 months")
    flexible_dates: bool = Field(False, description="User said dates are flexible")
    weeks: int | None = Field(None, description="Length in weeks (a month = 4)")
    categories: list[str] | None = Field(None, description="Category ids from the allowed list")
    destinations: list[str] | None = Field(None, description="Destination ids from the allowed list (countries/regions expand to their ids)")
    level: Literal["beginner", "intermediate", "advanced"] | None = None
    level_note: str | None = Field(None, description="CEFR code if given, e.g. B1")
    instruction_language: str | None = Field(None, description="Language the user wants to learn or be taught in, English name, e.g. Spanish")
    interests: list[str] | None = Field(None, description="Lowercase interest tags such as food, budget, spanish, homestay, outdoors")
    surprise: bool = False
    skip_questions: bool = Field(False, description="User asked to just see options")


@dataclass
class PlannerOutput:
    request: TravelRequest
    next: Next
    missing: list[MissingField] = field(default_factory=list)
    assumptions: list[L] = field(default_factory=list)
    question: str | None = None


# ───────────── rule-based parser (offline fallback; same behavior as Phase 1) ─────────────

MONTHS = [
    (r"\b(january|jan|enero)\b", 0), (r"\b(february|feb|febrero)\b", 1), (r"\b(march|marzo)\b", 2),
    (r"\b(april|apr|abril)\b", 3), (r"\b(may|mayo)\b", 4), (r"\b(june|jun|junio)\b", 5), (r"\b(july|jul|julio)\b", 6),
    (r"\b(august|aug|agosto)\b", 7), (r"\b(september|sept|sep|septiembre|setiembre)\b", 8),
    (r"\b(october|oct|octubre)\b", 9), (r"\b(november|nov|noviembre)\b", 10), (r"\b(december|dec|diciembre)\b", 11),
]
# A season names dates, except in a program name: "summer school", "escuela de verano".
_NOT_A_PROGRAM = r"(?<!escuela de )(?<!curso de )(?<!cursos de )(?<!programa de )"
_NOT_A_PROGRAM_AFTER = r"(?!\s+(?:school|course|program|programme|camp|session|institute|academy))"
SEASONS = [
    (_NOT_A_PROGRAM + r"\b(summer|verano)\b" + _NOT_A_PROGRAM_AFTER, [5, 6, 7]),
    (_NOT_A_PROGRAM + r"\b(winter|invierno)\b" + _NOT_A_PROGRAM_AFTER, [11, 0, 1]),
    (_NOT_A_PROGRAM + r"\b(spring|primavera)\b" + _NOT_A_PROGRAM_AFTER, [2, 3, 4]),
    (_NOT_A_PROGRAM + r"\b(fall|autumn|otoño|otono)\b" + _NOT_A_PROGRAM_AFTER, [8, 9, 10]),
]
NUMBER_WORDS = {"one": 1, "a": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6, "seven": 7, "eight": 8,
                "un": 1, "una": 1, "uno": 1, "dos": 2, "tres": 3, "cuatro": 4, "cinco": 5, "seis": 6, "siete": 7, "ocho": 8}
CATEGORY_KEYWORDS = [
    (r"\b(spanish|español|espanol|italian|italiano|portuguese|portugués|portugues|japanese|japonés|japones|greek|griego|language|idioma|immersion|inmersión|inmersion)\b", "languages"),
    (r"\b(cook\w*|culinary|cuisine|chef|pasta|cocina\w*|culinari\w*|gastronom\w*)\b", "cooking"),
    (r"\b(art|arte|paint\w*|pintura|ceramic\w*|cerámica|ceramica|pottery|draw\w*|dibujo|weav\w*|tejido|textile\w*)\b", "art"),
    (r"\b(architect\w*|arquitect\w*|gaud[ií])\b", "architecture"),
    (r"\b(anthropolog\w*|antropolog\w*|ethnograph\w*|etnograf\w*)\b", "anthropology"),
    (r"\b(philosoph\w*|filosof\w*|stoic\w*|estoic\w*|plato|platón)\b", "philosophy"),
    (r"\b(histor\w*|archaeolog\w*|archeolog\w*|arqueolog\w*)\b", "history"),
    (r"\b(music\w*|música|musica|danc\w*|baile|danza|fado|flamenco|guitar\w*)\b", "music-dance"),
    (r"\b(photo\w*|foto\w*|film|cine)\b", "photo-film"),
    (r"\b(writ\w*|escrit\w*|escribir|memoir|memorias)\b", "writing"),
    (r"\b(yoga|wellness|bienestar|meditat\w*|meditaci\w*)\b", "wellness"),
    (r"\b(sustainab\w*|sostenib\w*|ecolog\w*|permacultur\w*|conservation|conservaci\w*|nature|naturaleza)\b", "sustainability"),
    (r"\b(volunteer\w*|voluntari\w*)\b", "volunteering"),
]
LANG_KEYWORDS = [
    (r"\b(spanish|español|espanol)\b", "Spanish"), (r"\b(italian|italiano)\b", "Italian"),
    (r"\b(portuguese|portugués|portugues)\b", "Portuguese"), (r"\b(japanese|japonés|japones)\b", "Japanese"),
    (r"\b(greek|griego)\b", "Greek"),
]
REGIONS = [
    (r"\b(europe|europa)\b", ["florence", "bologna", "barcelona", "lisbon", "athens"]),
    (r"\b(asia)\b", ["kyoto", "chiang-mai"]),
    (r"\b(latin america|latinoamérica|latinoamerica|central america|centroamérica|centroamerica)\b",
     ["antigua", "quetzaltenango", "oaxaca"]),
]


def _parse_money(raw: str) -> int:
    cleaned = re.sub(r"[.,](?=\d{3}\b)", "", raw).replace(",", ".")
    return round(float(cleaned))


def rule_extract(text: str, cat: Catalog) -> Extraction:
    t = text.lower()
    out = Extraction(intent="search")
    if re.search(r"\b(start over|reset|new search|empezar de nuevo|nueva búsqueda|nueva busqueda)\b", t):
        out.intent = "reset"
    elif re.search(r"\b(compare|comparar|compara)\b", t):
        out.intent = "compare"
    elif re.search(r"\b(draft|email|e-mail|inquiry|write to|correo|escribir|redacta\w*)\b", t):
        out.intent = "draft"
    elif re.search(r"\b(next one|what'?s next|próxim[oa]|siguiente)\b", t):
        out.intent = "next"

    m = (re.search(r"(?:\$|us\$|usd\s?|€|eur\s?)\s?(\d[\d.,]*)\s?(k)?\b", t)
         or re.search(r"(\d[\d.,]*)\s?(k)?\s?(?:usd|dollars|dólares|dolares|bucks|euros?)\b", t)
         or re.search(r"(?:budget|presupuesto)(?:\s+(?:of|is|de|es))?\s+(\d[\d.,]*)\s?(k)?", t))
    if m:
        n = _parse_money(m.group(1)) * (1000 if m.group(2) else 1)
        if n >= 100:
            out.budget_usd = n
    wm = re.search(r"\b(\d+|one|two|three|four|five|six|seven|eight|a|uno|una|un|dos|tres|cuatro|cinco|seis|siete|ocho)[\s-]*(weeks?|semanas?)\b", t)
    if wm:
        out.weeks = int(wm.group(1)) if wm.group(1).isdigit() else NUMBER_WORDS.get(wm.group(1))
    elif re.search(r"\b(a|one|un|1)\s+(month|mes)\b", t):
        out.weeks = 4
    months = {mo for pat, mo in MONTHS if re.search(pat, t)}
    for pat, ms in SEASONS:
        if re.search(pat, t):
            months.update(ms)
    if months:
        out.start_months = sorted(months)
    out.flexible_dates = bool(re.search(r"\b(flexible|any ?time|cualquier (fecha|momento|mes))\b", t))
    cats = [c for pat, c in CATEGORY_KEYWORDS if re.search(pat, t)]
    out.categories = list(dict.fromkeys(cats)) or None
    out.instruction_language = next((lang for pat, lang in LANG_KEYWORDS if re.search(pat, t)), None)
    interests = []
    for pat, tag in [(r"\b(food|foodie|eat\w*|comida|comer|gastronom\w*)\b", "food"),
                     (r"\b(budget|cheap|affordable|barato|económico|economico|presupuesto ajustado)\b", "budget"),
                     (r"\b(spanish|español|espanol)\b", "spanish"),
                     (r"\b(homestay|host family|familia anfitriona|con familia)\b", "homestay"),
                     (r"\b(outdoors?|hiking|aire libre)\b", "outdoors")]:
        if re.search(pat, t):
            interests.append(tag)
    out.interests = interests or None
    dests: list[str] = []
    for d in cat.destinations.values():
        names = [d.name, d.id, d.country.en, d.country.es]
        if any(n.lower().split(" (")[0] in t for n in names):
            dests.append(d.id)
    if re.search(r"\bxela\b", t):
        dests.append("quetzaltenango")
    for pat, ids in REGIONS:
        if re.search(pat, t):
            dests.extend(ids)
    out.destinations = list(dict.fromkeys(dests)) or None
    cefr = re.search(r"\b([abc][12])\b", t)
    level = cefr_to_level(cefr.group(1)) if cefr else None
    if re.search(r"\b(beginner|principiante|básico|basico|from scratch|desde cero)\b", t):
        level = "beginner"
    if re.search(r"\b(intermediate|intermedio)\b", t):
        level = "intermediate"
    if re.search(r"\b(advanced|avanzado|fluent|fluido)\b", t):
        level = "advanced"
    out.level = level
    out.level_note = cefr.group(1).upper() if cefr else None
    out.surprise = bool(re.search(r"\b(surprise|sorpr[eé]nde\w*)\b", t))
    out.skip_questions = bool(re.search(r"\b(just show|show me|skip|muéstrame|muestrame|sin preguntas)\b", t))
    return out


# ───────────── Planner ─────────────


class Planner:
    def __init__(self, cat: Catalog, claude: Claude):
        self.cat = cat
        self.claude = claude

    def _system(self) -> str:
        cats = ", ".join(c.id for c in self.cat.categories)
        dests = ", ".join(f"{d.id} ({d.name}, {d.country.en})" for d in self.cat.destinations.values())
        return (
            "You are the Planner for Juni, an advisor for short learning trips abroad (1-8 weeks). "
            "Extract only what the user's latest message states; leave every other field empty. "
            "Never invent budgets or dates. A reply like 'July' or '$2,500' to a follow-up question is intent=search.\n"
            f"Allowed category ids: {cats}.\nAllowed destination ids: {dests}."
        )

    def extract(self, message: str) -> Extraction:
        got = self.claude.parse(Extraction, system=self._system(), user=message)
        if got is None:
            return rule_extract(message, self.cat)
        # Keep only ids the catalog knows; the model output is validated, not trusted blindly.
        got.categories = [c for c in got.categories or [] if any(c == x.id for x in self.cat.categories)] or None
        got.destinations = [d for d in got.destinations or [] if d in self.cat.destinations] or None
        got.start_months = [m for m in got.start_months or [] if 0 <= m <= 11] or None
        return got

    def plan(self, message: str, state: SharedState, profile: Profile, past_program_ids: list[str]) -> PlannerOutput:
        ex = self.extract(message)
        assumptions: list[L] = []
        if ex.intent == "reset":
            return PlannerOutput(TravelRequest(), "reset")
        if ex.intent == "compare" and state.last_results:
            return PlannerOutput(state.request, "compare")
        if ex.intent == "draft" and state.last_results:
            return PlannerOutput(state.request, "draft")
        if ex.intent == "question":
            return PlannerOutput(state.request, "question", question=message)

        new_topic = bool(ex.categories or ex.destinations or ex.surprise) and bool(state.last_results)
        r = TravelRequest() if new_topic else state.request.model_copy(deep=True)
        if ex.budget_usd:
            r.budget = ex.budget_usd
        if ex.weeks:
            r.weeks = ex.weeks
        if ex.start_months:
            r.months = ex.start_months
        if ex.flexible_dates:
            r.months = []
        if ex.categories:
            r.categories = ex.categories
        if ex.destinations:
            r.destinations = ex.destinations
        if ex.level:
            r.level = ex.level
        if ex.level_note:
            r.level_note = ex.level_note
        if ex.instruction_language:
            r.instruction_language = ex.instruction_language
        if ex.interests:
            r.interests = list(dict.fromkeys([*(r.interests or []), *ex.interests]))
        if ex.surprise:
            r.surprise = True

        if ex.intent == "next" and past_program_ids:
            past = [self.cat.programs[p] for p in past_program_ids if p in self.cat.programs]
            r.surprise = True
            r.interests = list(dict.fromkeys(t for p in past for t in p.tags))
            r.categories = list(dict.fromkeys(p.category for p in past))
            assumptions.append(L(en="Your past experiences (what you studied and loved)",
                                 es="Tus experiencias anteriores (lo que estudiaste y te gustó)"))

        if not r.passport and profile.passport:
            r.passport = profile.passport
            assumptions.append(L(en=f"Passport country: {profile.passport} (from your profile)",
                                 es=f"País del pasaporte: {profile.passport} (de tu perfil)"))

        def budget_from_profile() -> None:
            r.budget = profile.budget_max
            assumptions.append(L(en=f"Budget up to {money(profile.budget_max, 'en')} (from your profile)",
                                 es=f"Presupuesto de hasta {money(profile.budget_max, 'es')} (de tu perfil)"))

        if r.surprise:
            if not r.budget and profile.budget_max:
                budget_from_profile()
            if not r.categories and profile.interests:
                r.categories = list(profile.interests)
                assumptions.append(L(en="Your interests from your profile", es="Tus intereses de tu perfil"))
            return PlannerOutput(r, "search", assumptions=assumptions)

        if r.categories and "languages" in r.categories and not r.level:
            lang = (r.instruction_language or "").lower()
            skill = next((s for s in profile.skills if lang and lang in s.label.lower()), None)
            lvl = cefr_to_level(skill.level) if skill else None
            if skill and lvl:
                r.level = lvl
                r.level_note = f"{skill.label} {skill.level}"
                assumptions.append(L(en=f"Level: {skill.label} {skill.level} (from your profile)",
                                     es=f"Nivel: {skill.label} {skill.level} (de tu perfil)"))

        missing: list[MissingField] = []
        if r.months is None:
            missing.append("dates")
        if not r.budget:
            missing.append("budget")
        if not r.passport:
            missing.append("passport")
        if r.categories and "languages" in r.categories and not r.level:
            missing.append("level")
        unasked = [m for m in missing if m not in state.asked]

        has_topic = bool(r.categories or r.destinations)
        if not has_topic:
            return PlannerOutput(r, "ask", missing=["dates"] if not unasked else unasked, assumptions=assumptions)
        if unasked and not ex.skip_questions:
            return PlannerOutput(r, "ask", missing=unasked, assumptions=assumptions)

        # Anything still missing becomes a stated assumption instead of another question.
        if not r.budget and profile.budget_max:
            budget_from_profile()
        if r.months is None:
            r.months = []
            assumptions.append(L(en="Flexible dates", es="Fechas flexibles"))
        return PlannerOutput(r, "search", assumptions=assumptions)
