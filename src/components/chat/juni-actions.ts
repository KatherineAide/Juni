import { getProgram } from "@/data/programs";
import { getSchool } from "@/data/schools";
import { translate } from "@/i18n";
import { focusTurn, greeting, mockApplication, runTurn } from "@/lib/agents/mock";
import type { ActionProposal } from "@/lib/agents/types";
import type { ChatMessage, ChatPart } from "@/lib/chat";
import { uid } from "@/lib/format";
import { actions, getState } from "@/lib/store";

const THINK_MS = 650;

function push(...messages: ChatMessage[]) {
  actions.setChat((c) => ({ ...c, messages: [...c.messages, ...messages] }));
}

function ctx() {
  const s = getState();
  return { profile: s.profile, pastProgramIds: s.experiences.map((e) => e.programId) };
}

function respond(produce: () => ChatPart[]) {
  actions.setChat((c) => ({ ...c, thinking: true }));
  window.setTimeout(() => {
    const parts = produce();
    push({ id: uid("m"), role: "juni", parts });
    actions.setChat((c) => ({ ...c, thinking: false }));
  }, THINK_MS);
}

function ensureGreeting() {
  if (getState().chat.messages.length === 0) push({ id: uid("m"), role: "juni", parts: greeting(getState().profile.name) });
}

/** Send a free-text message to Juni (mock Planner → Scout → Verifier → Logistics → Fit). */
export function sendMessage(text: string) {
  const trimmed = text.trim();
  if (!trimmed || getState().chat.thinking) return;
  ensureGreeting();
  push({ id: uid("m"), role: "user", parts: [{ type: "text", text: trimmed }] });
  respond(() => {
    const { parts, state } = runTurn(trimmed, getState().chat.agent, ctx());
    actions.setChat((c) => ({ ...c, agent: state }));
    return parts;
  });
}

/** "Ask Juni about this program". */
export function askAboutProgram(programId: string) {
  const p = getProgram(programId);
  if (!p || getState().chat.thinking) return;
  ensureGreeting();
  const lang = getState().profile.lang;
  push({ id: uid("m"), role: "user", parts: [{ type: "text", text: translate(lang, "chat.focusPrompt", { title: p.title[lang] }) }] });
  respond(() => {
    const { parts, state } = focusTurn(programId, ctx(), getState().chat.agent);
    actions.setChat((c) => ({ ...c, agent: state }));
    return parts;
  });
}

function patchProposal(id: string, patch: Partial<ActionProposal>) {
  actions.setChat((c) => ({
    ...c,
    messages: c.messages.map((m) => ({
      ...m,
      parts: m.parts.map((part) => (part.type === "proposal" && part.proposal.id === id ? { ...part, proposal: { ...part.proposal, ...patch } } : part)),
    })),
  }));
}

export function editProposal(id: string) {
  patchProposal(id, { status: "editing" });
}

/** The user explicitly approved: only now does the Application agent draft (never send). */
export function approveProposal(proposal: ActionProposal, questions?: string[]) {
  const final = { ...proposal, questions: questions ?? proposal.questions, status: "approved" as const };
  patchProposal(proposal.id, final);
  const s = getState();
  const lang = s.profile.lang;
  const school = getSchool(getProgram(proposal.programId)!.schoolId)!;
  push({ id: uid("m"), role: "user", parts: [{ type: "text", text: translate(lang, "chat.ackApprove", { school: school.name }) }] });
  respond(() => {
    const draft = mockApplication.draftInquiry(final, getState().profile, getState().chat.agent.request);
    actions.saveDraft(proposal.programId, draft);
    return [
      { type: "steps", steps: [{ agent: "application", summary: { en: `Drafted an inquiry to ${school.name}. Not sent.`, es: `Redacté una consulta para ${school.name}. No enviada.` } }] },
      { type: "text", text: { en: translate("en", "chat.reply.drafted"), es: translate("es", "chat.reply.drafted") } },
      { type: "draft", draft, programId: proposal.programId },
    ];
  });
}

export function rejectProposal(proposal: ActionProposal) {
  patchProposal(proposal.id, { status: "rejected" });
  const lang = getState().profile.lang;
  push({ id: uid("m"), role: "user", parts: [{ type: "text", text: translate(lang, "chat.ackReject") }] });
  respond(() => [{ type: "text", text: { en: translate("en", "chat.reply.rejected"), es: translate("es", "chat.reply.rejected") } }]);
}

export function newChat() {
  actions.setChat(() => ({ messages: [], agent: { request: {}, asked: [], lastResults: [] }, thinking: false }));
}
