"""Logistics: visa requirements, housing, exchange rates and total trip cost."""

from __future__ import annotations

from ..catalog import Catalog
from ..fit import estimate_trip
from ..models import Program, TripEstimate, VisaRule


class Logistics:
    def __init__(self, cat: Catalog):
        self.cat = cat

    def visa(self, country_code: str, passport: str) -> VisaRule | None:
        return self.cat.visa(country_code, passport)

    def estimate(self, p: Program, weeks: int, housing: str) -> TripEstimate:
        return estimate_trip(self.cat, p, weeks, housing)
