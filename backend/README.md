# Juni backend (Phase 2 — not implemented yet)

Planned: **FastAPI + LangGraph**, PostgreSQL (`../db/schema.sql`).

`juni_agents/contracts.py` defines the agent interfaces and wire models. They mirror
the TypeScript contracts in `src/lib/agents/types.ts`, which the Phase 1 front-end
implements with mock data in `src/lib/agents/mock.ts`.

## Graph

```
user message ─▶ Planner ──(missing dates/budget/passport/level?)──▶ ask follow-up
                   │
                   ▼
                 Scout (DB + web search) ─▶ Verifier ─▶ Logistics ─▶ Fit ─▶ response parts
                                                                        │
                       user approves an ActionProposal ─────────────────▶ Application (draft only)
```

## Non-negotiables

- Agents are advisory. No tool can book, pay or send messages. The Application agent only
  returns drafts, and only after an explicit approval event from the user.
- Fetched school web content is passed to models as quoted, untrusted **data** inside a
  constrained extraction schema — never concatenated into instructions.
- Ranking (Fit) ignores commissions and the `sponsored` flag.
- Every price/date carries `source` + `last_checked`; visa answers carry the embassy disclaimer.

## Planned endpoints

| Method | Path | Body → Response |
| --- | --- | --- |
| POST | `/chat/sessions` | → `{session_id}` |
| POST | `/chat/sessions/{id}/messages` | `{text}` → `{parts: ChatPart[]}` |
| POST | `/chat/sessions/{id}/proposals/{pid}` | `{decision: approve\|edit\|reject, questions?}` → `{parts}` |
| GET | `/programs`, `/programs/{id}` | filters → programs with verification |
| GET | `/destinations/{id}/visa?passport=XX` | → `VisaRule` |
