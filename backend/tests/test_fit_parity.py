"""The Python fit engine must match the front-end's (src/lib/fit.ts) exactly.

Fixture regenerated with: npx tsx scripts/export-fit-fixture.ts
"""

import json
from pathlib import Path

import pytest

from juni.fit import evaluate_program
from juni.models import Profile, TravelRequest

FIXTURE = json.loads((Path(__file__).parent / "fixtures" / "fit_parity.json").read_text())


@pytest.mark.parametrize("case", FIXTURE["cases"], ids=lambda c: json.dumps(c["request"])[:60])
def test_fit_matches_frontend(catalog, case):
    profile = Profile.model_validate(FIXTURE["profile"])
    req = TravelRequest.model_validate(case["request"])
    for expected in case["results"]:
        got = evaluate_program(catalog, catalog.programs[expected["programId"]], req, profile)
        assert got.status == expected["status"], expected["programId"]
        assert got.score == pytest.approx(expected["score"], abs=1e-3), expected["programId"]
        assert got.estimate.total == expected["total"], expected["programId"]
        assert got.session_id == expected["sessionId"], expected["programId"]
        assert [r.text.en for r in got.reasons] == expected["reasons"], expected["programId"]
        assert [r.text.es for r in got.reasons] == expected["reasonsEs"], expected["programId"]
