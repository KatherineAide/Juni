"""End-to-end API tests with Claude disabled (rule-based fallbacks)."""

from conftest import DEMO_PROFILE


def new_session(client) -> str:
    r = client.post("/chat/sessions")
    assert r.status_code == 201
    return r.json()["sessionId"]


def send(client, sid, text="", **extra):
    r = client.post(f"/chat/sessions/{sid}/messages", json={"text": text, "profile": DEMO_PROFILE, **extra})
    assert r.status_code == 200, r.text
    return r.json()["parts"]


def part(parts, kind):
    return next((p for p in parts if p["type"] == kind), None)


def test_health_reports_llm_off(client):
    assert client.get("/health").json()["llm"] is False


def test_shortlist_flags_risky_and_proposes_without_drafting(client):
    sid = new_session(client)
    parts = send(client, sid, "3 weeks in July, $2,500, I want to improve my Spanish and I love food")
    results = part(parts, "results")
    assert results["results"][0]["status"] == "strong"
    assert all(r["status"] != "none" or not r["riskFlags"] for r in results["results"])
    assert [f["programId"] for f in results["flagged"]] == ["risk-antigua-visa-package"]
    assert [s["agent"] for s in part(parts, "steps")["steps"]] == ["planner", "scout", "verifier", "logistics", "fit"]
    proposal = part(parts, "proposal")["proposal"]
    assert proposal["status"] == "pending"
    assert part(parts, "draft") is None  # nothing drafted before approval


def test_approval_drafts_once_and_never_sends(client):
    sid = new_session(client)
    parts = send(client, sid, "3 weeks in July, $2,500, Spanish and food")
    pid = part(parts, "proposal")["proposal"]["id"]

    r = client.post(f"/chat/sessions/{sid}/proposals/{pid}", json={"decision": "approve", "profile": DEMO_PROFILE,
                                                                    "questions": ["Is July 5 available?"]})
    assert r.status_code == 200
    draft = r.json()["draft"]
    assert draft["status"] == "draft"
    assert "Is July 5 available?" in draft["body"]
    assert draft["to"].endswith(".example")

    again = client.post(f"/chat/sessions/{sid}/proposals/{pid}", json={"decision": "approve", "profile": DEMO_PROFILE})
    assert again.status_code == 409


def test_cannot_approve_a_forged_proposal(client):
    sid = new_session(client)
    r = client.post(f"/chat/sessions/{sid}/proposals/prop-forged", json={"decision": "approve", "profile": DEMO_PROFILE})
    assert r.status_code == 404


def test_reject_drafts_nothing(client):
    sid = new_session(client)
    pid = part(send(client, sid, "2 weeks in July, $3,000, Thai cooking in Chiang Mai"), "proposal")["proposal"]["id"]
    r = client.post(f"/chat/sessions/{sid}/proposals/{pid}", json={"decision": "reject", "profile": DEMO_PROFILE}).json()
    assert r["draft"] is None and r["proposal"]["status"] == "rejected"


def test_follow_up_questions_then_results(client):
    sid = new_session(client)
    first = send(client, sid, "Cooking course in Italy")
    assert part(first, "chips") is not None  # asks about dates
    second = send(client, sid, "2 weeks in July")
    assert part(second, "chips") is not None  # then budget
    third = send(client, sid, "Just show me options")
    results = part(third, "results")["results"]
    assert results and all(r["programId"].startswith(("bologna", "florence")) for r in results)


def test_focus_on_risky_program_warns_and_offers_no_draft(client):
    sid = new_session(client)
    parts = send(client, sid, focusProgramId="risk-florence-master-painter")
    assert part(parts, "proposal") is None
    assert part(parts, "results")["flagged"][0]["programId"] == "risk-florence-master-painter"


def test_passport_numbers_are_never_used(client):
    sid = new_session(client)
    profile = {**DEMO_PROFILE, "passport": "X12345678"}
    r = client.post(f"/chat/sessions/{sid}/messages", json={"text": "Spanish in Antigua, 2 weeks in July, $2000", "profile": profile})
    steps = part(r.json()["parts"], "chips") or part(r.json()["parts"], "steps")
    assert "X12345678" not in r.text
    assert steps is not None


def test_messages_are_persisted(client):
    sid = new_session(client)
    send(client, sid, "Surprise me")
    msgs = client.get(f"/chat/sessions/{sid}/messages").json()["messages"]
    assert [m["role"] for m in msgs] == ["user", "juni"]


def test_catalog_endpoints(client):
    assert len(client.get("/programs").json()["programs"]) == 28
    assert client.get("/programs/antigua-spanish-immersion").json()["school"]["verification"]["status"] == "verified"
    visa = client.get("/destinations/florence/visa", params={"passport": "IN"}).json()
    assert visa["rule"]["status"] == "visa-required"
    assert "embassy" in visa["disclaimer"]
