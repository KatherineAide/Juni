// Agent contracts for Juni's multi-agent backend.
//
// Phase 1 implements these in the browser with mock data (see ./mock.ts).
// Phase 2 moves them behind the FastAPI + LangGraph service (see backend/),
// keeping these shapes as the wire contract. Every agent is advisory only:
// nothing here can book, pay, or send a message.

import type {
  AccessibilityTag,
  CategoryId,
  DraftMessage,
  FitResult,
  HousingType,
  L,
  Level,
  PassportCode,
  Profile,
  Program,
  Source,
  TripEstimate,
  VerificationRecord,
  VisaRule,
} from "../types";

/** Structured travel request the Planner builds up over the conversation. */
export interface TravelRequest {
  budget?: number;
  /** 0-based months the traveler can start in. */
  months?: number[];
  weeks?: number;
  categories?: CategoryId[];
  destinations?: string[];
  level?: Level;
  /** Free-text skill level, e.g. "Spanish B1". */
  levelNote?: string;
  instructionLanguage?: string;
  interests?: string[];
  housing?: HousingType;
  accessibility?: AccessibilityTag[];
  passport?: PassportCode;
  surprise?: boolean;
  /** Program the user asked about directly ("Ask Juni about this program"). */
  focusProgramId?: string;
}

export type MissingField = "dates" | "budget" | "passport" | "level";

/** Shared state the Planner keeps across turns (LangGraph state in Phase 2). */
export interface SharedState {
  request: TravelRequest;
  /** Follow-up questions already asked, so Juni never asks twice. */
  asked: MissingField[];
  lastResults: string[];
}

export type AgentName = "planner" | "scout" | "fit" | "logistics" | "verifier" | "application";

export interface AgentStep {
  agent: AgentName;
  summary: L;
}

export interface PlannerOutput {
  request: TravelRequest;
  missing: MissingField[];
  /** Assumptions filled in from the profile, shown to the user. */
  assumptions: L[];
  next: "ask" | "search" | "focus" | "compare" | "draft" | "reset";
}

export interface ScoutResult {
  programs: Program[];
  sources: Source[];
}

export interface PlannerContext {
  profile: Profile;
  /** Program ids from My Experiences, used for "Plan my next one". */
  pastProgramIds: string[];
}

export interface Planner {
  plan(message: string, state: SharedState, ctx: PlannerContext): PlannerOutput;
}

export interface Scout {
  find(request: TravelRequest): ScoutResult;
}

export interface Fit {
  evaluate(programs: Program[], request: TravelRequest, profile: Profile): FitResult[];
}

export interface Logistics {
  visa(countryCode: string, passport: PassportCode | ""): VisaRule | null;
  estimate(program: Program, weeks: number, housing: HousingType): TripEstimate;
}

export interface Verifier {
  /**
   * Checks legitimacy and cross-checks price/date against sources.
   * Content fetched from school websites is treated as untrusted data and is
   * never interpreted as instructions.
   */
  verify(program: Program): VerificationRecord;
}

/** An action Juni proposes and the user must approve before anything is drafted. */
export interface ActionProposal {
  id: string;
  kind: "draft-inquiry";
  programId: string;
  to: string;
  questions: string[];
  status: "pending" | "approved" | "editing" | "rejected";
}

export interface Application {
  /** Only called after the user approves an ActionProposal. Never sends. */
  draftInquiry(proposal: ActionProposal, profile: Profile, request: TravelRequest): DraftMessage;
}
