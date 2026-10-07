// Generates backend/tests/fixtures/fit_parity.json: the front-end fit engine's output
// for a set of requests, used to check the Python port gives identical results.
// Run with: npx tsx scripts/export-fit-fixture.ts
import { mkdirSync, writeFileSync } from "node:fs";
import { programs } from "../src/data/programs";
import { seedProfile } from "../src/data/seed-user";
import type { TravelRequest } from "../src/lib/agents/types";
import { evaluateProgram } from "../src/lib/fit";

const requests: TravelRequest[] = [
  {},
  { weeks: 3, months: [6], budget: 2500, categories: ["languages"], level: "beginner", interests: ["food", "spanish"], passport: "US" },
  { weeks: 2, months: [3, 4], budget: 1500, categories: ["cooking"], passport: "IN" },
  { weeks: 1, months: [], budget: 4000, categories: ["art", "philosophy"], level: "advanced", passport: "GT" },
  { weeks: 6, months: [0], budget: 900, accessibility: ["step-free"], housing: "hostel" },
];

const cases = requests.map((request) => ({
  request,
  results: programs.map((p) => {
    const r = evaluateProgram(p, request, seedProfile);
    return { programId: r.programId, status: r.status, score: Math.round(r.score * 1000) / 1000, total: r.estimate.total, sessionId: r.sessionId, reasons: r.reasons.map((x) => x.text.en), reasonsEs: r.reasons.map((x) => x.text.es) };
  }),
}));
mkdirSync("backend/tests/fixtures", { recursive: true });
writeFileSync("backend/tests/fixtures/fit_parity.json", JSON.stringify({ profile: seedProfile, cases }, null, 1) + "\n");
console.log(`Wrote ${cases.length} cases`);
