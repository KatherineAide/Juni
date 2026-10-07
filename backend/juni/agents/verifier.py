"""Verifier / Critic: checks school legitimacy and cross-checks facts against sources."""

from __future__ import annotations

import re

from ..catalog import Catalog
from ..models import Program, VerificationRecord, WebFinding

SCAM_PATTERNS = [
    (r"wire[- ]?transfer|western union|crypto|bitcoin", "Wire-transfer or crypto payment"),
    (r"guarantee[ds]?\s+(a\s+)?visa|visa\s+guarantee", "\"Guaranteed visa\" claim"),
    (r"no refund|non[- ]?refundable", "No refunds"),
    (r"p\.?o\.?\s*box", "Only a P.O. box address"),
]


class Verifier:
    def __init__(self, cat: Catalog):
        self.cat = cat

    def verify(self, p: Program) -> VerificationRecord:
        return self.cat.school_of(p).verification

    def screen_web(self, findings: list[WebFinding]) -> list[WebFinding]:
        """Adds rule-based red flags to web findings. They are never marked verified."""
        screened = []
        for f in findings:
            text = f"{f.title} {f.notes}".lower()
            flags = list(f.red_flags)
            for pattern, label in SCAM_PATTERNS:
                if re.search(pattern, text) and label not in flags:
                    flags.append(label)
            if f.price_per_week_usd is not None and f.price_per_week_usd < 60:
                flags.append("Price far below comparable programs")
            screened.append(f.model_copy(update={"red_flags": flags}))
        return screened
