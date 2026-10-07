"""Fit engine: hard constraints first, then soft ranking. Port of src/lib/fit.ts.

Ranking never looks at commissions or the `sponsored` flag.
"""

from __future__ import annotations

import math
import re

from .catalog import Catalog
from .fmt import date, money, month_name, month_of
from .models import FitReason, FitResult, L, Level, Profile, Program, ProgramSession, TravelRequest, TripEstimate

RISK_FLAG_TEXT: dict[str, L] = {
    "payment_methods": L(en="Wire-transfer-only payment", es="Pago solo por transferencia"),
    "visa_claims": L(en="Misleading visa claims", es="Promesas de visa engañosas"),
    "physical_address": L(en="No physical address", es="Sin dirección física"),
    "refund_policy": L(en="No refund policy", es="Sin política de reembolso"),
    "independent_reviews": L(en="No independent reviews", es="Sin reseñas independientes"),
    "registration": L(en="No business registration found", es="Sin registro mercantil"),
    "price_crosscheck": L(en="Price doesn't match sources", es="El precio no coincide con las fuentes"),
}

LEVEL_RANK = {"beginner": 0, "intermediate": 1, "advanced": 2, "all": -1}
LEVEL_NAME = {
    "beginner": L(en="beginner", es="principiante"),
    "intermediate": L(en="intermediate", es="intermedio"),
    "advanced": L(en="advanced", es="avanzado"),
    "all": L(en="all levels", es="todos los niveles"),
}


def cefr_to_level(code: str | None) -> Level | None:
    if not code:
        return None
    m = re.search(r"[ABC][12]", code.upper())
    if not m:
        return None
    return {"A": "beginner", "B": "intermediate", "C": "advanced"}[m.group(0)[0]]  # type: ignore[return-value]


def js_round(x: float) -> int:
    """Math.round semantics (half up), so totals match the front-end exactly."""
    return math.floor(x + 0.5)


def default_weeks(p: Program, wanted: int | None = None) -> int:
    w = wanted if wanted is not None else min(p.weeks.max, max(p.weeks.min, 2))
    return min(p.weeks.max, max(p.weeks.min, w))


def default_housing(p: Program, preferred: list[str]) -> str:
    for h in p.housing:
        if h.type in preferred:
            return h.type
    return p.housing[0].type if p.housing else "none"


def estimate_trip(cat: Catalog, p: Program, weeks: int, housing_type: str) -> TripEstimate:
    """Total trip cost in USD, excluding flights."""
    dest = cat.destination_of(p)
    housing = next((h for h in p.housing if h.type == housing_type), p.housing[0] if p.housing else None)
    living_weekly = js_round((dest.costs.living.min + dest.costs.living.max) / 2)
    # Homestays include most meals, so day-to-day spending is lower.
    factor = 0.6 if housing and housing.type in ("homestay", "none") else 1
    tuition = p.price_per_week * weeks
    housing_cost = (housing.price_per_week if housing else 0) * weeks
    living = js_round(living_weekly * factor) * weeks
    return TripEstimate(
        weeks=weeks,
        tuition=tuition,
        registration=p.registration_fee,
        housing=housing_cost,
        living=living,
        total=tuition + p.registration_fee + housing_cost + living,
        housing_type=housing.type if housing else "none",
    )


def risk_flags(cat: Catalog, p: Program) -> list[L]:
    return [RISK_FLAG_TEXT[c.id] for c in cat.school_of(p).verification.checks if c.result == "fail" and c.id in RISK_FLAG_TEXT]


def upcoming_sessions(cat: Catalog, p: Program) -> list[ProgramSession]:
    return [s for s in p.sessions if s.start > cat.today]


def evaluate_program(cat: Catalog, p: Program, req: TravelRequest, profile: Profile) -> FitResult:
    reasons: list[FitReason] = []
    hard_fail = False
    partial = False
    score = 0.0
    school = cat.school_of(p)
    dest = cat.destination_of(p)

    def add(ok, en: str, es: str) -> None:
        reasons.append(FitReason(ok=ok, text=L(en=en, es=es)))

    # Verification is a hard constraint: risky schools are never recommended.
    status = school.verification.status
    if status == "risk":
        hard_fail = True
        add(False, "Failed verification — Juni won't recommend this school", "No superó la verificación: Juni no recomienda esta escuela")
    elif status == "unverified":
        partial = True
        add("partial", "School not fully verified yet — ask for refund terms in writing",
            "Escuela aún no verificada del todo: pide los términos de reembolso por escrito")
    else:
        score += 2
        add(True, "Verified school with a written refund policy", "Escuela verificada con política de reembolso por escrito")

    # Length
    weeks = default_weeks(p, req.weeks)
    if req.weeks:
        if p.weeks.min <= req.weeks <= p.weeks.max:
            score += 2
            add(True, f"Runs for your {req.weeks} weeks", f"Dura tus {req.weeks} semanas")
        elif abs(weeks - req.weeks) <= 1:
            partial = True
            add("partial", f"Offered for {p.weeks.min}–{p.weeks.max} weeks (you asked for {req.weeks})",
                f"Se ofrece de {p.weeks.min} a {p.weeks.max} semanas (pediste {req.weeks})")
        else:
            hard_fail = True
            add(False, f"Only runs {p.weeks.min}–{p.weeks.max} weeks", f"Solo dura de {p.weeks.min} a {p.weeks.max} semanas")

    # Dates
    upcoming = upcoming_sessions(cat, p)
    session = upcoming[0] if upcoming else None
    if req.months:
        months_en = "/".join(month_name(m, "en") for m in req.months)
        months_es = "/".join(month_name(m, "es") for m in req.months)
        in_month = next((s for s in upcoming if month_of(s.start) in req.months), None)
        if in_month:
            session = in_month
            score += 3
            add(True, f"Starts {date(in_month.start, 'en')} — in {months_en}", f"Empieza el {date(in_month.start, 'es')}, en {months_es}")
        else:
            near = next((s for s in upcoming if any(abs(month_of(s.start) - m) == 1 for m in req.months)), None)
            if near:
                session = near
                partial = True
                add("partial", f"Closest start is {date(near.start, 'en')}, outside {months_en}",
                    f"El inicio más cercano es el {date(near.start, 'es')}, fuera de {months_es}")
            else:
                hard_fail = True
                add(False, f"No sessions in {months_en}", f"No hay sesiones en {months_es}")
    elif session is None:
        hard_fail = True
        add(False, "No upcoming sessions", "No hay próximas sesiones")

    # Budget (hard constraint with 10% tolerance)
    prefs = [req.housing] if req.housing else list(profile.housing)
    est = estimate_trip(cat, p, weeks, default_housing(p, prefs))
    if req.budget:
        b = req.budget
        if est.total <= b:
            score += 3
            add(True, f"About {money(est.total, 'en')} total — within your {money(b, 'en')}",
                f"Unos {money(est.total, 'es')} en total, dentro de tus {money(b, 'es')}")
        elif est.total <= b * 1.1:
            partial = True
            add("partial", f"About {money(est.total, 'en')} — slightly over your {money(b, 'en')}",
                f"Unos {money(est.total, 'es')}, algo más de tus {money(b, 'es')}")
        else:
            hard_fail = True
            add(False, f"About {money(est.total, 'en')} — over your {money(b, 'en')}",
                f"Unos {money(est.total, 'es')}, supera tus {money(b, 'es')}")

    # Level
    if req.level and p.level != "all" and req.level != "all":
        diff = LEVEL_RANK[p.level] - LEVEL_RANK[req.level]
        if diff == 0:
            score += 1
            add(True, f"Matches your level ({LEVEL_NAME[req.level].en})", f"Coincide con tu nivel ({LEVEL_NAME[req.level].es})")
        elif diff > 0:
            if diff == 1:
                partial = True
            else:
                hard_fail = True
            add("partial" if diff == 1 else False, f"Designed for {LEVEL_NAME[p.level].en} learners",
                f"Pensado para nivel {LEVEL_NAME[p.level].es}")
    elif p.level == "all":
        score += 1
        add(True, "Open to all levels", "Abierto a todos los niveles")

    # Soft preferences
    if req.categories and p.category in req.categories:
        score += 3
        en, es = cat.category_name(p.category)
        add(True, f"{en} — what you asked for", f"{es}: lo que pediste")
    hits = [i for i in (req.interests or []) if i in p.tags]
    if hits:
        score += len(hits) * 1.5
        add(True, f"Matches your interests: {', '.join(hits)}", f"Coincide con tus intereses: {', '.join(hits)}")
    if p.category in profile.interests:
        score += 1
    if p.rating:
        score += (p.rating - 4) * 2

    # Visa (soft: we flag, the embassy decides)
    visa = cat.visa(dest.country_code, req.passport or profile.passport)
    if visa and visa.status in ("visa-required", "check"):
        partial = True
        if visa.status == "check":
            add("partial", "Visa rules unconfirmed for your passport", "Requisitos de visa sin confirmar para tu pasaporte")
        else:
            add("partial", "You'll likely need a visa — allow extra time", "Probablemente necesitarás visa: calcula más tiempo")

    # Accessibility needs
    needs = req.accessibility if req.accessibility is not None else profile.accessibility
    if needs and any(a not in p.accessibility for a in needs):
        partial = True
        add("partial", "Some of your accessibility needs aren't confirmed — ask the school",
            "Algunas necesidades de accesibilidad no están confirmadas: pregunta a la escuela")

    fit_status = "none" if hard_fail else "partial" if partial else "strong"
    return FitResult(
        program_id=p.id,
        status=fit_status,
        score=score - 100 if hard_fail else score - 3 if partial else score,
        reasons=reasons,
        risk_flags=risk_flags(cat, p),
        estimate=est,
        session_id=session.id if session else None,
    )


def rank(results: list[FitResult]) -> list[FitResult]:
    return sorted(results, key=lambda r: r.score, reverse=True)
