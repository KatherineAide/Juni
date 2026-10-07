"""Typed domain and wire models.

Mirrors src/lib/types.ts, src/lib/chat.ts and src/lib/agents/types.ts. Fields are
snake_case in Python and camelCase on the wire so the Next.js front-end can use
the backend's responses without any mapping.
"""

from __future__ import annotations

from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

Lang = Literal["en", "es"]
FitStatus = Literal["strong", "partial", "none"]
VerificationStatus = Literal["verified", "unverified", "risk"]
CheckResult = Literal["pass", "fail", "unknown"]
Level = Literal["beginner", "intermediate", "advanced", "all"]
HousingType = Literal["homestay", "residence", "apartment", "hostel", "none"]
MissingField = Literal["dates", "budget", "passport", "level"]
AgentName = Literal["planner", "scout", "fit", "logistics", "verifier", "application"]


class Wire(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, extra="ignore")


class L(Wire):
    """A string in every supported UI language."""

    en: str
    es: str

    @classmethod
    def same(cls, text: str) -> L:
        return cls(en=text, es=text)


class Source(Wire):
    label: str
    url: str


class MoneyRange(Wire):
    min: int
    max: int


class Costs(Wire):
    course: MoneyRange
    housing: MoneyRange
    living: MoneyRange


class Currency(Wire):
    code: str
    per_usd: float
    last_checked: str
    source: Source


class LatLng(Wire):
    lat: float
    lng: float


class Destination(Wire):
    id: str
    name: str
    country: L
    country_code: str
    region: L
    image: str
    image_alt: L
    tagline: L
    overview: L
    costs: Costs
    currency: Currency
    best_seasons: L
    safety: L
    accessibility: L
    center: LatLng


class VerificationCheck(Wire):
    id: str
    result: CheckResult
    note: L


class VerificationRecord(Wire):
    status: VerificationStatus
    checks: list[VerificationCheck]
    sources: list[Source]
    last_checked: str


class School(Wire):
    id: str
    name: str
    destination_id: str
    address: str | None
    coords: LatLng | None
    website: str
    email: str
    founded: int | None
    payment_methods: list[str]
    refund_policy: L | None
    verification: VerificationRecord


class ProgramSession(Wire):
    id: str
    start: str
    end: str
    seats_left: int


class HousingOption(Wire):
    type: HousingType
    price_per_week: int
    note: L | None = None


class WeeksRange(Wire):
    min: int
    max: int


class Program(Wire):
    id: str
    title: L
    school_id: str
    destination_id: str
    category: str
    image: str
    image_alt: L
    summary: L
    description: L
    schedule: list[L]
    includes: list[L]
    weeks: WeeksRange
    hours_per_week: int
    level: Level
    instruction_languages: list[str]
    price_per_week: int
    registration_fee: int
    price_source: Source
    price_last_checked: str
    sessions: list[ProgramSession]
    housing: list[HousingOption]
    certificate: bool
    accessibility: list[str]
    rating: float | None
    review_count: int
    application_deadline_days: int
    min_age: int
    tags: list[str]
    sponsored: bool = False


class Review(Wire):
    id: str
    program_id: str
    author: str
    home_country: str
    lang: Lang
    rating: int
    date: str
    text: str
    verified_participant: bool


class Category(Wire):
    id: str
    name: L
    blurb: L
    image: str


class VisaRule(Wire):
    status: Literal["domestic", "free-movement", "visa-free", "evisa", "visa-required", "check"]
    max_stay_days: int | None = None
    note: L


class Skill(Wire):
    label: str
    level: str


class Profile(Wire):
    name: str = ""
    lang: Lang = "en"
    home_city: str = ""
    passport: str = ""  # country code only — never document numbers
    budget_min: int = 0
    budget_max: int = 0
    interests: list[str] = []
    skills: list[Skill] = []
    housing: list[HousingType] = []
    accessibility: list[str] = []
    dietary: list[str] = []


# ───────────────────────── Agent contracts ─────────────────────────


class TravelRequest(Wire):
    budget: int | None = None
    months: list[int] | None = None  # 0-based; [] means flexible
    weeks: int | None = None
    categories: list[str] | None = None
    destinations: list[str] | None = None
    level: Level | None = None
    level_note: str | None = None
    instruction_language: str | None = None
    interests: list[str] | None = None
    housing: HousingType | None = None
    accessibility: list[str] | None = None
    passport: str | None = None
    surprise: bool | None = None
    focus_program_id: str | None = None


class SharedState(Wire):
    request: TravelRequest = Field(default_factory=TravelRequest)
    asked: list[MissingField] = []
    last_results: list[str] = []


class AgentStep(Wire):
    agent: AgentName
    summary: L


class FitReason(Wire):
    ok: bool | Literal["partial"]
    text: L


class TripEstimate(Wire):
    weeks: int
    tuition: int
    registration: int
    housing: int
    living: int
    total: int
    housing_type: HousingType


class FitResult(Wire):
    program_id: str
    status: FitStatus
    score: float
    reasons: list[FitReason]
    risk_flags: list[L]
    estimate: TripEstimate
    session_id: str | None


class ActionProposal(Wire):
    id: str
    kind: Literal["draft-inquiry"] = "draft-inquiry"
    program_id: str
    to: str
    questions: list[str]
    status: Literal["pending", "approved", "editing", "rejected"] = "pending"


class DraftMessage(Wire):
    id: str
    subject: str
    body: str
    to: str
    status: Literal["draft"] = "draft"  # Juni never sends
    created_at: str


# ───────────────────────── Chat parts (rich message content) ─────────────────────────


class Chip(Wire):
    label: L
    value: L


class TextPart(Wire):
    type: Literal["text"] = "text"
    text: L | str


class ChipsPart(Wire):
    type: Literal["chips"] = "chips"
    chips: list[Chip]


class ResultsPart(Wire):
    type: Literal["results"] = "results"
    results: list[FitResult]
    flagged: list[FitResult]


class CostPart(Wire):
    type: Literal["cost"] = "cost"
    result: FitResult


class ComparePart(Wire):
    type: Literal["compare"] = "compare"
    results: list[FitResult]


class ProposalPart(Wire):
    type: Literal["proposal"] = "proposal"
    proposal: ActionProposal


class DraftPart(Wire):
    type: Literal["draft"] = "draft"
    draft: DraftMessage
    program_id: str


class StepsPart(Wire):
    type: Literal["steps"] = "steps"
    steps: list[AgentStep]


class WebFindingsPart(Wire):
    """Programs Scout found on the web: unverified, never ranked with the catalog."""

    type: Literal["web"] = "web"
    findings: list[WebFinding]


ChatPart = Annotated[
    TextPart | ChipsPart | ResultsPart | CostPart | ComparePart | ProposalPart | DraftPart | StepsPart | WebFindingsPart,
    Field(discriminator="type"),
]


class WebFinding(Wire):
    """A program discovered by web search. Extracted from untrusted pages."""

    title: str
    school: str
    city: str
    country: str
    url: str
    price_per_week_usd: int | None = None
    weeks: str | None = None
    notes: str = ""
    red_flags: list[str] = []


WebFindingsPart.model_rebuild()
