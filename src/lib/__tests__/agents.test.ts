import { describe, expect, it } from "vitest";
import { categories } from "@/data/categories";
import { destinations } from "@/data/destinations";
import { programs } from "@/data/programs";
import { getSchool } from "@/data/schools";
import { seedProfile } from "@/data/seed-user";
import { emptyState, parseMessage, runTurn, focusTurn } from "../agents/mock";
import { evaluateProgram } from "../fit";

const ctx = { profile: seedProfile, pastProgramIds: ["oaxaca-market-mole"] };

describe("seed dataset", () => {
  it("has 25 programs plus 3 risky ones across 8+ categories and destinations", () => {
    const risky = programs.filter((p) => getSchool(p.schoolId)!.verification.status === "risk");
    expect(risky).toHaveLength(3);
    expect(programs.length - risky.length).toBe(25);
    expect(new Set(programs.map((p) => p.category)).size).toBeGreaterThanOrEqual(8);
    expect(new Set(programs.map((p) => p.destinationId)).size).toBeGreaterThanOrEqual(8);
    expect(destinations.map((d) => d.id)).toEqual(expect.arrayContaining(["antigua", "quetzaltenango"]));
    expect(categories).toHaveLength(13);
  });

  it("references valid schools and destinations", () => {
    for (const p of programs) {
      expect(getSchool(p.schoolId), p.id).toBeDefined();
      expect(destinations.some((d) => d.id === p.destinationId), p.id).toBe(true);
    }
  });
});

describe("Planner parsing", () => {
  it("parses the canonical English request", () => {
    const r = parseMessage("3 weeks in July, $2,500, I want to improve my Spanish and I love food");
    expect(r).toMatchObject({ weeks: 3, months: [6], budget: 2500, instructionLanguage: "Spanish", categories: ["languages"] });
    expect(r.interests).toEqual(expect.arrayContaining(["food", "spanish"]));
  });

  it("parses Spanish", () => {
    const r = parseMessage("Tres semanas en julio con 2.500 dólares, curso de cocina en Italia");
    expect(r).toMatchObject({ weeks: 3, months: [6], budget: 2500 });
    expect(r.categories).toContain("cooking");
    expect(r.destinations).toEqual(expect.arrayContaining(["florence", "bologna"]));
  });
});

describe("Planner seasons", () => {
  it("treats 'summer school' as a program, not a season", () => {
    expect(parseMessage("Philosophy summer school in Athens in June").months).toEqual([5]);
    expect(parseMessage("Escuela de verano de filosofía en junio").months).toEqual([5]);
    expect(parseMessage("Something this summer").months).toEqual([5, 6, 7]);
  });
});

describe("Juni turn", () => {
  it("asks a follow-up when dates are missing", () => {
    const { parts, state } = runTurn("Cooking course in Italy", emptyState, ctx);
    expect(parts.some((p) => p.type === "chips")).toBe(true);
    expect(state.asked).toContain("dates");
  });

  it("returns a verified shortlist with fit status, flags risky listings and proposes (not sends) a draft", () => {
    const { parts } = runTurn("3 weeks in July, $2,500, I want to improve my Spanish and I love food", emptyState, ctx);
    const results = parts.find((p) => p.type === "results");
    expect(results?.type).toBe("results");
    if (results?.type !== "results") return;
    expect(results.results[0].status).toBe("strong");
    for (const r of results.results.filter((r) => r.status !== "none")) {
      const p = programs.find((x) => x.id === r.programId)!;
      expect(getSchool(p.schoolId)!.verification.status).not.toBe("risk");
    }
    expect(results.flagged.map((f) => f.programId)).toContain("risk-antigua-visa-package");
    const proposal = parts.find((p) => p.type === "proposal");
    expect(proposal?.type === "proposal" && proposal.proposal.status).toBe("pending");
  });

  it("never recommends a risky program, even when asked directly", () => {
    const { parts } = focusTurn("risk-florence-master-painter", ctx, emptyState);
    expect(parts.some((p) => p.type === "proposal")).toBe(false);
    const p = programs.find((x) => x.id === "risk-florence-master-painter")!;
    expect(evaluateProgram(p, {}, seedProfile).status).toBe("none");
  });
});
