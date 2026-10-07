# Juni

An AI-powered planner for short-term learning abroad (1–8 weeks): language immersion,
cooking schools, art and architecture workshops, anthropology field courses, philosophy
summer schools and more. Juni is a planner and advisor — it **never books, pays or sends
messages** without explicit approval.

**Status: Phase 3** — Next.js front-end, a FastAPI + LangGraph backend running Juni's agents
on Claude, and an evaluation suite + dashboard (`/evals`). All schools, prices and dates are
still fictional seed data.

## Run it

Front-end only (in-browser mock agents):

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # agent/fit unit tests (vitest)
npm run lint && npm run typecheck && npm run build
```

With the Phase 2 backend (real agents — see [backend/README.md](backend/README.md)):

```bash
cd backend && uv sync && ANTHROPIC_API_KEY=... uv run uvicorn juni.main:app --port 8000
# in another terminal, from the repo root:
NEXT_PUBLIC_JUNI_API_URL=http://localhost:8000 npm run dev
```

Or `ANTHROPIC_API_KEY=... docker compose up --build` for Postgres + API. Without an API key the
backend still works, using rule-based fallbacks.

Stack: Next.js 16 (App Router, Cache Components) · TypeScript · Tailwind CSS v4 · lucide-react.

## What's in Phase 1

| Tab | Route | Highlights |
| --- | --- | --- |
| Juni (chat) | `/chat` | Rich answers (program cards, cost breakdown, comparison table), follow-up questions with quick replies, Strong/Partial/Doesn't-fit status with reasons, risk flags, "How Juni built this" agent trace, Approve / Edit / Reject before any draft. Deep links: `/chat?program=<id>`, `/chat?next=1`. |
| Destinations | `/destinations`, `/destinations/[id]` | Photo grid; overview, programs, weekly costs + exchange rate, visa notes by passport, seasons, safety, accessibility, schematic school map. |
| Programs | `/programs`, `/programs/[id]`, `/programs/compare` | 13 category tiles, 11 filters + sort, compare up to 3, detail with schedule, housing, interactive total cost estimate, verification checks, verified reviews, deadlines, "Ask Juni". |
| My Trips | `/trips`, `/trips?trip=<id>` | Saved → Planning → Applied → Enrolled → Completed; countdown, checklist, deadlines & reminders, planned-vs-actual budget, school contact, drafted messages. |
| My Experiences | `/experiences` | Timeline, photos, certificates, skills, journal, verified review, "Plan my next one". |
| Profile | `/profile` | Everything Juni uses, editable, with a "What Juni knows about you" summary (passport **country only**). |
| Also | `/saved`, `/notifications`, `/trust` | Wishlist, deadline/price/match notifications, Trust & Safety explainer. |

EN/ES switching is in the sidebar (desktop) or top bar (mobile); all UI strings live in
`src/i18n/{en,es}.ts` and program/destination content is localized in the data files.

Try in chat: *"3 weeks in July, $2,500, I want to improve my Spanish and I love food"*, or tap
*Cooking course in Italy* to see follow-up questions.

## Evaluation (Phase 3)

Twelve **test travelers** (`backend/juni/evals/cases.json`) — a budget student, a Spanish-speaking
retiree, an Indian passport holder needing a Schengen visa, a wheelchair user, someone with an
impossible budget, scam bait, a vague request that needs follow-ups, and more — are played
through the real agent graph. Each reply is scored against Juni's product rules:

| Check | What it verifies |
| --- | --- |
| Safety | No risky school (or case-specific exclusion) is ever recommended |
| Approval gate | Nothing is drafted before approval; unapproved proposals are refused |
| Constraints | Every "Strong fit" respects the traveler's budget, dates and length (and access needs) |
| Understanding | The request was parsed correctly (dates, length, budget) |
| Relevance | An expected program is in the top 3 |
| Follow-up | Juni asks for missing details, in the right order |
| Flags / Honesty / Visa / Proposal | Scams flagged; "nothing fits" said plainly; visa warnings shown; drafts offered only when sensible |

Each check has a **mutation test** proving it fails when the behavior it guards is broken
(`backend/tests/test_evals.py`). CI runs the suite and fails if any traveler fails.

```bash
cd backend
uv run python -m juni.evals                     # summary in the terminal
uv run python -m juni.evals --save              # store the run (shows on the dashboard)
uv run python -m juni.evals --snapshot ../src/data/eval-snapshot.json   # refresh the bundled snapshot
```

The **dashboard** at `/evals` (sidebar → Evaluation) shows pass rates per check, the trend across
runs, Claude usage and latency, and each traveler's full conversation. With the API connected it
lists stored runs and has a "Run evaluation" button; without it, it shows the bundled snapshot.
With `ANTHROPIC_API_KEY` set the same suite measures the Claude-powered agents.

## Seed data (`src/data/`)

- 25 programs across all 13 categories and 10 destinations (incl. **Antigua** and
  **Quetzaltenango, Guatemala**), plus **3 deliberately risky programs** (ids `risk-*`)
  that fail scam checks (wire-only payment, "guaranteed visa", no address, no refund policy,
  no independent reviews).
- Visa notes for 10 passport groups — simplified and always shown with
  "Confirm with the official embassy or consulate."
- Phase 1 uses a fixed date (`src/lib/mock-clock.ts`) so sessions and countdowns are stable.
- Placeholder photos load from Unsplash; every image falls back to a designed gradient if
  it can't load. Replace with licensed photography before launch.

## Architecture

```
src/
  app/                 routes (server components; content rendered by client components)
  components/          UI by feature (chat, programs, destinations, trips, …)
  data/                mock seed data
  i18n/                EN/ES dictionaries + useT()
  lib/
    agents/types.ts    agent contracts (Planner, Scout, Fit, Logistics, Verifier, Application)
    agents/mock.ts     Phase 1 in-browser implementation of those contracts
    fit.ts, estimate.ts  hard constraints + soft ranking, total trip cost
    store.ts           client state persisted to localStorage (swap for the API in Phase 2)
db/schema.sql          target relational PostgreSQL data model
backend/               Phase 2 FastAPI + LangGraph service (agents, API, tests)
scripts/               export seed data / fit fixtures from the front-end for the backend
```

## Trust & safety rules enforced in code

- Risky schools are a hard "Doesn't fit" and are shown only under **Flagged by Juni**.
- Drafts are produced only after the user approves a proposal, are labeled "Not sent", and
  the only way out is the user's own copy / email app.
- Ranking ignores sponsorship; sponsored items must be labeled.
- Prices, exchange rates, verification and visa data show a source and "last checked" date.

## Roadmap

- **Phase 2 (done):** FastAPI + LangGraph agents on Claude, Postgres, web discovery.
- **Phase 3 (done):** evaluation suite with test travelers, metrics and dashboard.
- **Next:** run the suite with Claude and tune, user accounts/auth, real school data and
  verification sources.
