// Client for the Phase 2 backend (FastAPI + LangGraph, see backend/).
// When NEXT_PUBLIC_JUNI_API_URL is unset, the app uses the in-browser mock agents.

import type { ActionProposal } from "./agents/types";
import type { ChatPart } from "./chat";
import type { DraftMessage, Profile } from "./types";

export const API_URL = process.env.NEXT_PUBLIC_JUNI_API_URL?.replace(/\/$/, "") ?? "";

export function backendEnabled(): boolean {
  return API_URL.length > 0;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function call<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new ApiError(res.status, `Juni API ${res.status}: ${await res.text()}`);
  return (await res.json()) as T;
}

export const juniApi = {
  createSession: () => call<{ sessionId: string }>("/chat/sessions"),
  sendMessage: (sessionId: string, body: { text?: string; focusProgramId?: string; profile: Profile; pastProgramIds: string[] }) =>
    call<{ parts: ChatPart[] }>(`/chat/sessions/${sessionId}/messages`, body),
  decide: (sessionId: string, proposalId: string, body: { decision: "approve" | "reject"; questions?: string[]; profile: Profile }) =>
    call<{ proposal: ActionProposal; parts: ChatPart[]; draft: DraftMessage | null }>(`/chat/sessions/${sessionId}/proposals/${proposalId}`, body),
};
