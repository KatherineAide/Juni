import { getProgram } from "@/data/programs";
import { getSchool } from "@/data/schools";
import { translate } from "@/i18n";
import { focusTurn, greeting, mockApplication, runTurn } from "@/lib/agents/mock";
import type { ActionProposal } from "@/lib/agents/types";
import { ApiError, backendEnabled, juniApi } from "@/lib/api";
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

const OFFLINE_NOTE: ChatPart = {
  type: "text",
  text: {
    en: "(I couldn't reach Juni's servers, so this answer comes from offline demo data.)",
    es: "(No pude conectar con los servidores de Juni; esta respuesta usa datos de demostración sin conexión.)",
  },
};

/**
 * Produces Juni's reply. With the Phase 2 backend configured, `remote` runs the real
 * agent graph; otherwise (or if the backend is unreachable) the in-browser mock runs.
 */
function respond(local: () => ChatPart[], remote?: () => Promise<ChatPart[]>) {
  actions.setChat((c) => ({ ...c, thinking: true }));
  const finish = (parts: ChatPart[]) => {
    push({ id: uid("m"), role: "juni", parts });
    actions.setChat((c) => ({ ...c, thinking: false }));
  };
  if (remote && backendEnabled()) {
    remote()
      .then(finish)
      .catch((err: unknown) => {
        console.error(err);
        finish([OFFLINE_NOTE, ...local()]);
      });
    return;
  }
  window.setTimeout(() => finish(local()), THINK_MS);
}

async function sessionId(): Promise<string> {
  const existing = getState().chat.sessionId;
  if (existing) return existing;
  const { sessionId: id } = await juniApi.createSession();
  actions.setChat((c) => ({ ...c, sessionId: id }));
  return id;
}

/** Runs a session call; if the backend no longer knows the session, starts a new one and retries once. */
async function withSession<T>(fn: (id: string) => Promise<T>): Promise<T> {
  try {
    return await fn(await sessionId());
  } catch (err) {
    if (!(err instanceof ApiError && err.status === 404 && getState().chat.sessionId)) throw err;
    actions.setChat((c) => ({ ...c, sessionId: undefined }));
    return fn(await sessionId());
  }
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
  respond(
    () => {
      const { parts, state } = runTurn(trimmed, getState().chat.agent, ctx());
      actions.setChat((c) => ({ ...c, agent: state }));
      return parts;
    },
    async () => (await withSession((id) => juniApi.sendMessage(id, { text: trimmed, ...ctx() }))).parts,
  );
}

/** "Ask Juni about this program". */
export function askAboutProgram(programId: string) {
  const p = getProgram(programId);
  if (!p || getState().chat.thinking) return;
  ensureGreeting();
  const lang = getState().profile.lang;
  push({ id: uid("m"), role: "user", parts: [{ type: "text", text: translate(lang, "chat.focusPrompt", { title: p.title[lang] }) }] });
  respond(
    () => {
      const { parts, state } = focusTurn(programId, ctx(), getState().chat.agent);
      actions.setChat((c) => ({ ...c, agent: state }));
      return parts;
    },
    async () => (await withSession((id) => juniApi.sendMessage(id, { focusProgramId: programId, ...ctx() }))).parts,
  );
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
  respond(
    () => {
      const draft = mockApplication.draftInquiry(final, getState().profile, getState().chat.agent.request);
      actions.saveDraft(proposal.programId, draft);
      return [
        { type: "steps", steps: [{ agent: "application", summary: { en: `Drafted an inquiry to ${school.name}. Not sent.`, es: `Redacté una consulta para ${school.name}. No enviada.` } }] },
        { type: "text", text: { en: translate("en", "chat.reply.drafted"), es: translate("es", "chat.reply.drafted") } },
        { type: "draft", draft, programId: proposal.programId },
      ];
    },
    async () => {
      const res = await juniApi.decide(await sessionId(), proposal.id, { decision: "approve", questions: final.questions, profile: getState().profile });
      if (res.draft) actions.saveDraft(proposal.programId, res.draft);
      return res.parts;
    },
  );
}

export function rejectProposal(proposal: ActionProposal) {
  patchProposal(proposal.id, { status: "rejected" });
  const lang = getState().profile.lang;
  push({ id: uid("m"), role: "user", parts: [{ type: "text", text: translate(lang, "chat.ackReject") }] });
  respond(
    () => [{ type: "text", text: { en: translate("en", "chat.reply.rejected"), es: translate("es", "chat.reply.rejected") } }],
    async () => (await juniApi.decide(await sessionId(), proposal.id, { decision: "reject", profile: getState().profile })).parts,
  );
}

export function newChat() {
  // Dropping the session id starts a fresh backend session on the next message.
  actions.setChat(() => ({ messages: [], agent: { request: {}, asked: [], lastResults: [] }, thinking: false }));
}
