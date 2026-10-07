import type { ActionProposal, AgentStep } from "./agents/types";
import type { DraftMessage, FitResult, L } from "./types";

export type ChatPart =
  | { type: "text"; text: L | string }
  | { type: "chips"; chips: { label: L; value: L }[] }
  | { type: "results"; results: FitResult[]; flagged: FitResult[] }
  | { type: "cost"; result: FitResult }
  | { type: "compare"; results: FitResult[] }
  | { type: "proposal"; proposal: ActionProposal }
  | { type: "draft"; draft: DraftMessage; programId: string }
  | { type: "steps"; steps: AgentStep[] };

export interface ChatMessage {
  id: string;
  role: "user" | "juni";
  parts: ChatPart[];
}
