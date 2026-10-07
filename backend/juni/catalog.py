"""Read-only, in-memory view of the catalog that the agents query.

The catalog is small (hundreds of programs), so loading it once per process keeps
agent nodes fast and synchronous. Reload after an import.
"""

from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.orm import Session, sessionmaker

from .db import DestinationRow, ProgramRow, ReferenceRow, ReviewRow, SchoolRow
from .models import Category, Destination, Program, Review, School, VisaRule


@dataclass
class Catalog:
    today: str
    programs: dict[str, Program]
    schools: dict[str, School]
    destinations: dict[str, Destination]
    reviews: list[Review]
    categories: list[Category]
    visa_rules: dict[str, dict[str, VisaRule]]
    visa_last_checked: str

    @classmethod
    def load(cls, factory: sessionmaker[Session]) -> Catalog:
        with factory() as s:
            ref = {r.key: r.data for r in s.scalars(select(ReferenceRow))}
            return cls(
                today=ref["today"],
                programs={r.id: Program.model_validate(r.data) for r in s.scalars(select(ProgramRow))},
                schools={r.id: School.model_validate(r.data) for r in s.scalars(select(SchoolRow))},
                destinations={r.id: Destination.model_validate(r.data) for r in s.scalars(select(DestinationRow))},
                reviews=[Review.model_validate(r.data) for r in s.scalars(select(ReviewRow))],
                categories=[Category.model_validate(c) for c in ref["categories"]],
                visa_rules={
                    country: {pp: VisaRule.model_validate(rule) for pp, rule in rules.items()}
                    for country, rules in ref["visaRules"].items()
                },
                visa_last_checked=ref["visaLastChecked"],
            )

    def school_of(self, p: Program) -> School:
        return self.schools[p.school_id]

    def destination_of(self, p: Program) -> Destination:
        return self.destinations[p.destination_id]

    def category_name(self, cid: str) -> tuple[str, str]:
        c = next(c for c in self.categories if c.id == cid)
        return c.name.en, c.name.es

    def visa(self, country_code: str, passport: str) -> VisaRule | None:
        if not passport:
            return None
        rule = self.visa_rules.get(country_code, {}).get(passport)
        if rule:
            return rule
        return VisaRule(
            status="check",
            note={"en": "We don't have verified information for this combination yet.",
                  "es": "Aún no tenemos información verificada para esta combinación."},
        )
