# Juni backend (Phase 2)

FastAPI + LangGraph service that runs Juni's agents. The Next.js front-end calls it when
`NEXT_PUBLIC_JUNI_API_URL` is set, and falls back to its in-browser mock agents otherwise.

## Run it

```bash
cd backend
uv sync
export ANTHROPIC_API_KEY=...        # optional — without it, agents use rule-based fallbacks
uv run uvicorn juni.main:app --reload --port 8000
```

Then, in the repo root: `NEXT_PUBLIC_JUNI_API_URL=http://localhost:8000 npm run dev`.

With Docker (Postgres + API): `ANTHROPIC_API_KEY=... docker compose up --build` from the repo root.

| Setting (env) | Default | Meaning |
| --- | --- | --- |
| `JUNI_DATABASE_URL` | `sqlite:///./juni.db` | Use `postgresql+psycopg://user:pass@host/db` in production |
| `JUNI_MODEL` | `claude-opus-5-5` | Claude model for all agents |
| `JUNI_USE_LLM` | `true` | Set `false` to force the deterministic fallbacks |
| `JUNI_WEB_SEARCH` | `true` | Let Scout search the web for programs beyond the catalog |
| `JUNI_CORS_ORIGINS` | `["http://localhost:3000"]` | Front-end origins allowed to call the API |

The database is created and seeded on first start from `juni/data/seed.json`
(regenerate it from the front-end data with `npm run export-seed`).

## Agent graph

```
START ─┬─ focus ────────────────────────────────────────────▶ END   ("Ask Juni about this program")
       └─ planner ─┬─ ask / reset / compare / draft / question ▶ END
                   └─ scout ▶ verifier ▶ logistics ▶ fit ▶ respond ▶ END

POST …/proposals/{id} (approve) ─▶ application (draft only, never sends)
```

| Agent | What it does | Uses Claude for |
| --- | --- | --- |
| Planner | Turns each message into a structured `TravelRequest`, keeps shared state, asks follow-ups (dates, budget, passport, level) | Structured extraction (falls back to the Phase 1 rule parser) and general questions |
| Scout | Searches the catalog; optionally finds up to 3 more programs on the web | Web search, then extraction of the results as **untrusted data** |
| Verifier | Uses each school's verification record; screens web finds for scam signs | — (rules) |
| Logistics | Visa rules by passport, total trip cost | — |
| Fit | Hard constraints then soft ranking with reasons; byte-for-byte the same as `src/lib/fit.ts` | — |
| Application | Drafts an inquiry email after approval | Drafting (falls back to a template) |

Claude calls use structured outputs, adaptive thinking with explicit effort, and server-side
refusal fallbacks (`fallbacks: "default"`). Any failure or refusal falls back to deterministic
logic, so the API keeps working without a key.

## Safety rules enforced in code

- **Nothing is ever sent, booked or paid.** Drafts are only created by `POST /chat/sessions/{id}/proposals/{pid}`
  with `decision: "approve"`, for a proposal the server itself issued in that session (forged ids → 404,
  repeats → 409).
- **Web content is untrusted data.** Search notes are wrapped in `<untrusted_web_content>` and passed to a
  tool-less extraction call told never to follow instructions inside them. Web finds are shown
  separately as *unverified* leads and never ranked with the verified catalog.
- **Risky schools are never recommended** (hard "Doesn't fit"), and ranking ignores sponsorship.
- **Passport country only:** any passport value that isn't a 2-letter country code is discarded.

## API

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/health` | Whether Claude and web search are active |
| POST | `/chat/sessions` | → `{sessionId}` |
| POST | `/chat/sessions/{id}/messages` | `{text?, focusProgramId?, profile, pastProgramIds}` → `{parts}` (rich chat parts) |
| GET | `/chat/sessions/{id}/messages` | Persisted history |
| POST | `/chat/sessions/{id}/proposals/{pid}` | `{decision: approve\|reject, questions?, profile}` → `{proposal, parts, draft}` |
| GET | `/programs`, `/programs/{id}`, `/destinations`, `/destinations/{id}/visa?passport=XX` | Catalog |

There's no user authentication yet — the front-end sends the profile with each request.
Add auth before storing real user data.

## Evaluation

`juni/evals/` plays the test travelers in `cases.json` through the agent graph and scores each
reply (safety, approval gate, constraints, understanding, relevance, follow-ups, flags, honesty,
visa, proposals), plus latency and Claude calls/tokens. See the root README for the check list.

```bash
uv run python -m juni.evals [--save] [--out run.json] [--snapshot ../src/data/eval-snapshot.json] [--min-pass 1.0]
```

API: `GET /evals/cases`, `GET /evals/runs`, `GET /evals/runs/{id}`, `POST /evals/runs` (runs the
suite now and stores it; synchronous — fast with rule-based agents, minutes with Claude).

Add a traveler by appending to `cases.json`: a `profile`, the `turns` they type (or a
`focusProgramId`), and `expect` keys — `request`, `topAnyOf`, `asks`, `flagged`,
`neverRecommend`, `noRecommendations`, `visaWarning`, `proposal`, `strongMustHaveAccessibility`.

## Tests

```bash
uv run pytest                      # SQLite
JUNI_TEST_DATABASE_URL=postgresql+psycopg://juni:juni@localhost/juni_test uv run pytest
uv run ruff check juni tests
```

`tests/test_fit_parity.py` checks the Python fit engine against output generated from the
front-end (`npx tsx scripts/export-fit-fixture.ts`). Claude-powered paths are tested with a
scripted stand-in client.
