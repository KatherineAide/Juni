// Phase 1 mock implementations of Juni's agents. They run in the browser over
// the seed dataset. Phase 2 replaces `runTurn` with a call to the FastAPI +
// LangGraph backend that implements the same contracts (./types.ts).

import { categories } from "@/data/categories";
import { destinations, getDestination } from "@/data/destinations";
import { getProgram, programs } from "@/data/programs";
import { getSchool } from "@/data/schools";
import { getVisaRule } from "@/data/visa";
import type { ChatPart } from "../chat";
import { estimateTrip } from "../estimate";
import { cefrToLevel, evaluateProgram, rankPrograms } from "../fit";
import { date, money, monthName, uid } from "../format";
import { MOCK_TODAY } from "../mock-clock";
import type { CategoryId, DraftMessage, L, Lang, Level, Profile } from "../types";
import type {
  ActionProposal,
  AgentStep,
  Application,
  Fit,
  Logistics,
  MissingField,
  Planner,
  PlannerContext,
  PlannerOutput,
  Scout,
  SharedState,
  TravelRequest,
  Verifier,
} from "./types";

const both = (en: string, es: string): L => ({ en, es });

export const emptyState: SharedState = { request: {}, asked: [], lastResults: [] };

// ───────────────────────── Planner ─────────────────────────

const MONTHS: [RegExp, number][] = [
  [/\b(january|jan|enero)\b/, 0],
  [/\b(february|feb|febrero)\b/, 1],
  [/\b(march|marzo)\b/, 2],
  [/\b(april|apr|abril)\b/, 3],
  [/\b(may|mayo)\b/, 4],
  [/\b(june|jun|junio)\b/, 5],
  [/\b(july|jul|julio)\b/, 6],
  [/\b(august|aug|agosto)\b/, 7],
  [/\b(september|sept|sep|septiembre|setiembre)\b/, 8],
  [/\b(october|oct|octubre)\b/, 9],
  [/\b(november|nov|noviembre)\b/, 10],
  [/\b(december|dec|diciembre)\b/, 11],
];

const SEASONS: [RegExp, number[]][] = [
  [/\b(summer|verano)\b/, [5, 6, 7]],
  [/\b(winter|invierno)\b/, [11, 0, 1]],
  [/\b(spring|primavera)\b/, [2, 3, 4]],
  [/\b(fall|autumn|otoño|otono)\b/, [8, 9, 10]],
];

const NUMBER_WORDS: Record<string, number> = {
  one: 1, a: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8,
  un: 1, una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8,
};

const CATEGORY_KEYWORDS: [RegExp, CategoryId][] = [
  [/\b(spanish|español|espanol|italian|italiano|portuguese|portugués|portugues|japanese|japonés|japones|greek|griego|language|idioma|immersion|inmersión|inmersion)\b/, "languages"],
  [/\b(cook\w*|culinary|cuisine|chef|pasta|cocina\w*|culinari\w*|gastronom\w*)\b/, "cooking"],
  [/\b(art|arte|paint\w*|pintura|ceramic\w*|cerámica|ceramica|pottery|draw\w*|dibujo|weav\w*|tejido|textile\w*)\b/, "art"],
  [/\b(architect\w*|arquitect\w*|gaud[ií])\b/, "architecture"],
  [/\b(anthropolog\w*|antropolog\w*|ethnograph\w*|etnograf\w*)\b/, "anthropology"],
  [/\b(philosoph\w*|filosof\w*|stoic\w*|estoic\w*|plato|platón)\b/, "philosophy"],
  [/\b(histor\w*|archaeolog\w*|archeolog\w*|arqueolog\w*)\b/, "history"],
  [/\b(music\w*|música|musica|danc\w*|baile|danza|fado|flamenco|guitar\w*)\b/, "music-dance"],
  [/\b(photo\w*|foto\w*|film|cine)\b/, "photo-film"],
  [/\b(writ\w*|escrit\w*|escribir|memoir|memorias)\b/, "writing"],
  [/\b(yoga|wellness|bienestar|meditat\w*|meditaci\w*)\b/, "wellness"],
  [/\b(sustainab\w*|sostenib\w*|ecolog\w*|permacultur\w*|conservation|conservaci\w*|nature|naturaleza)\b/, "sustainability"],
  [/\b(volunteer\w*|voluntari\w*)\b/, "volunteering"],
];

const LANG_KEYWORDS: [RegExp, string][] = [
  [/\b(spanish|español|espanol)\b/, "Spanish"],
  [/\b(italian|italiano)\b/, "Italian"],
  [/\b(portuguese|portugués|portugues)\b/, "Portuguese"],
  [/\b(japanese|japonés|japones)\b/, "Japanese"],
  [/\b(greek|griego)\b/, "Greek"],
];

const REGION_DESTINATIONS: [RegExp, string[]][] = [
  [/\b(europe|europa)\b/, ["florence", "bologna", "barcelona", "lisbon", "athens"]],
  [/\b(asia)\b/, ["kyoto", "chiang-mai"]],
  [/\b(latin america|latinoamérica|latinoamerica|central america|centroamérica|centroamerica)\b/, ["antigua", "quetzaltenango", "oaxaca"]],
];

function parseMoney(raw: string): number {
  // Treat "," and "." followed by exactly three digits as thousands separators.
  const cleaned = raw.replace(/[.,](?=\d{3}\b)/g, "").replace(",", ".");
  return Math.round(parseFloat(cleaned));
}

/** Pure text → structured request. Exported for tests and for Phase 2 parity checks. */
export function parseMessage(text: string): Partial<TravelRequest> & { flexibleDates?: boolean; skip?: boolean } {
  const t = text.toLowerCase();
  const out: Partial<TravelRequest> & { flexibleDates?: boolean; skip?: boolean } = {};

  const budgetMatch =
    t.match(/(?:\$|us\$|usd\s?|€|eur\s?)\s?(\d[\d.,]*)\s?(k)?\b/) ??
    t.match(/(\d[\d.,]*)\s?(k)?\s?(?:usd|dollars|dólares|dolares|bucks|euros?)\b/) ??
    t.match(/(?:budget|presupuesto)(?:\s+(?:of|is|de|es))?\s+(\d[\d.,]*)\s?(k)?/);
  if (budgetMatch) {
    const n = parseMoney(budgetMatch[1]) * (budgetMatch[2] ? 1000 : 1);
    if (n >= 100) out.budget = n;
  }

  const weeksMatch = t.match(/\b(\d+|one|two|three|four|five|six|seven|eight|a|uno|una|un|dos|tres|cuatro|cinco|seis|siete|ocho)[\s-]*(weeks?|semanas?)\b/);
  if (weeksMatch) {
    const n = Number(weeksMatch[1]) || NUMBER_WORDS[weeksMatch[1]];
    if (n) out.weeks = n;
  } else if (/\b(a|one|un|1)\s+(month|mes)\b/.test(t)) {
    out.weeks = 4;
  }

  const months = new Set<number>();
  for (const [re, m] of MONTHS) if (re.test(t)) months.add(m);
  for (const [re, ms] of SEASONS) if (re.test(t)) ms.forEach((m) => months.add(m));
  if (months.size) out.months = [...months];
  if (/\b(flexible|any ?time|cualquier (fecha|momento|mes))\b/.test(t)) out.flexibleDates = true;

  const cats = new Set<CategoryId>();
  for (const [re, c] of CATEGORY_KEYWORDS) if (re.test(t)) cats.add(c);
  if (cats.size) out.categories = [...cats];

  for (const [re, lang] of LANG_KEYWORDS) {
    if (re.test(t)) {
      out.instructionLanguage = lang;
      break;
    }
  }

  const interests = new Set<string>();
  if (/\b(food|foodie|eat\w*|comida|comer|gastronom\w*)\b/.test(t)) interests.add("food");
  if (/\b(budget|cheap|affordable|barato|económico|economico|presupuesto ajustado)\b/.test(t)) interests.add("budget");
  if (/\b(spanish|español|espanol)\b/.test(t)) interests.add("spanish");
  if (/\b(homestay|host family|familia anfitriona|con familia)\b/.test(t)) interests.add("homestay");
  if (/\b(outdoors?|hiking|aire libre)\b/.test(t)) interests.add("outdoors");
  if (interests.size) out.interests = [...interests];

  const dests = new Set<string>();
  for (const d of destinations) {
    const names = [d.name, d.id, d.country.en, d.country.es].map((n) => n.toLowerCase());
    if (names.some((n) => t.includes(n.split(" (")[0]))) dests.add(d.id);
  }
  if (/\bxela\b/.test(t)) dests.add("quetzaltenango");
  for (const [re, ids] of REGION_DESTINATIONS) if (re.test(t)) ids.forEach((id) => dests.add(id));
  if (dests.size) out.destinations = [...dests];

  const cefr = t.match(/\b([abc][12])\b/);
  let level: Level | undefined = cefrToLevel(cefr?.[1]);
  if (/\b(beginner|principiante|básico|basico|from scratch|desde cero)\b/.test(t)) level = "beginner";
  if (/\b(intermediate|intermedio)\b/.test(t)) level = "intermediate";
  if (/\b(advanced|avanzado|fluent|fluido)\b/.test(t)) level = "advanced";
  if (level) {
    out.level = level;
    if (cefr) out.levelNote = cefr[1].toUpperCase();
  }

  if (/\b(surprise|sorpr[eé]nde\w*)\b/.test(t)) out.surprise = true;
  if (/\b(just show|show me|skip|muéstrame|muestrame|sin preguntas)\b/.test(t)) out.skip = true;
  return out;
}

function mergeRequest(base: TravelRequest, patch: ReturnType<typeof parseMessage>): TravelRequest {
  const next: TravelRequest = { ...base };
  if (patch.budget) next.budget = patch.budget;
  if (patch.weeks) next.weeks = patch.weeks;
  if (patch.months) next.months = patch.months;
  if (patch.flexibleDates) next.months = [];
  if (patch.categories) next.categories = patch.categories;
  if (patch.destinations) next.destinations = patch.destinations;
  if (patch.level) next.level = patch.level;
  if (patch.levelNote) next.levelNote = patch.levelNote;
  if (patch.instructionLanguage) next.instructionLanguage = patch.instructionLanguage;
  if (patch.interests) next.interests = [...new Set([...(base.interests ?? []), ...patch.interests])];
  if (patch.surprise) next.surprise = true;
  return next;
}

export const mockPlanner: Planner = {
  plan(message: string, state: SharedState, ctx: PlannerContext): PlannerOutput {
    const t = message.toLowerCase();
    const { profile } = ctx;
    const assumptions: L[] = [];

    if (/\b(start over|reset|new search|empezar de nuevo|nueva búsqueda|nueva busqueda)\b/.test(t)) {
      return { request: {}, missing: [], assumptions, next: "reset" };
    }
    if (state.lastResults.length && /\b(compare|comparar|compara)\b/.test(t)) {
      return { request: state.request, missing: [], assumptions, next: "compare" };
    }
    if (state.lastResults.length && /\b(draft|email|e-mail|inquiry|write to|correo|escribir|redacta\w*)\b/.test(t)) {
      return { request: state.request, missing: [], assumptions, next: "draft" };
    }

    const parsed = parseMessage(message);
    // A message with a new topic starts a fresh request; answers to follow-ups merge.
    const isNewTopic = !!(parsed.categories || parsed.destinations || parsed.surprise) && state.lastResults.length > 0;
    let request = mergeRequest(isNewTopic ? {} : state.request, parsed);

    if (/\b(next one|what'?s next|próxim[oa]|siguiente)\b/.test(t) && ctx.pastProgramIds.length) {
      const past = ctx.pastProgramIds.map(getProgram).filter(Boolean);
      const tags = new Set(past.flatMap((p) => p!.tags));
      request = {
        ...request,
        surprise: true,
        interests: [...tags],
        categories: [...new Set(past.map((p) => p!.category))],
      };
      assumptions.push(both("Your past experiences (what you studied and loved)", "Tus experiencias anteriores (lo que estudiaste y te gustó)"));
    }

    if (!request.passport && profile.passport) {
      request.passport = profile.passport;
      assumptions.push(both(`Passport country: ${profile.passport} (from your profile)`, `País del pasaporte: ${profile.passport} (de tu perfil)`));
    }
    if (request.surprise) {
      if (!request.budget) {
        request.budget = profile.budgetMax;
        assumptions.push(both(`Budget up to ${money(profile.budgetMax, "en")} (from your profile)`, `Presupuesto de hasta ${money(profile.budgetMax, "es")} (de tu perfil)`));
      }
      if (!request.categories?.length && profile.interests.length) {
        request.categories = profile.interests;
        assumptions.push(both("Your interests from your profile", "Tus intereses de tu perfil"));
      }
      return { request, missing: [], assumptions, next: "search" };
    }

    if (request.categories?.includes("languages") && !request.level) {
      const skill = profile.skills.find((s) => request.instructionLanguage && s.label.toLowerCase().includes(request.instructionLanguage.toLowerCase()));
      const lvl = cefrToLevel(skill?.level);
      if (skill && lvl) {
        request.level = lvl;
        request.levelNote = `${skill.label} ${skill.level}`;
        assumptions.push(both(`Level: ${skill.label} ${skill.level} (from your profile)`, `Nivel: ${skill.label} ${skill.level} (de tu perfil)`));
      }
    }

    const missing: MissingField[] = [];
    if (request.months === undefined) missing.push("dates");
    if (!request.budget) missing.push("budget");
    if (!request.passport) missing.push("passport");
    if (request.categories?.includes("languages") && !request.level) missing.push("level");

    const unasked = missing.filter((m) => !state.asked.includes(m));
    if (unasked.length && !parsed.skip && (request.categories?.length || request.destinations?.length)) {
      return { request, missing: unasked, assumptions, next: "ask" };
    }
    if (!request.categories?.length && !request.destinations?.length) {
      return { request, missing: ["dates"], assumptions, next: unasked.length ? "ask" : "search" };
    }

    // Anything still missing gets a stated assumption instead of another question.
    if (!request.budget && profile.budgetMax) {
      request.budget = profile.budgetMax;
      assumptions.push(both(`Budget up to ${money(profile.budgetMax, "en")} (from your profile)`, `Presupuesto de hasta ${money(profile.budgetMax, "es")} (de tu perfil)`));
    }
    if (request.months === undefined) {
      request.months = [];
      assumptions.push(both("Flexible dates", "Fechas flexibles"));
    }
    return { request, missing: [], assumptions, next: "search" };
  },
};

// ───────────────────────── Scout ─────────────────────────

export const mockScout: Scout = {
  find(req) {
    let pool = programs;
    if (req.destinations?.length) pool = pool.filter((p) => req.destinations!.includes(p.destinationId));
    const wantsLang = req.instructionLanguage;
    const matches = pool.filter((p) => {
      const langOk = !wantsLang || p.instructionLanguages.includes(wantsLang);
      const catHit = req.categories?.includes(p.category) && (p.category !== "languages" || langOk);
      const interestHit = (req.interests ?? []).some((i) => i !== "budget" && p.tags.includes(i)) && langOk;
      if (!req.categories?.length && !req.interests?.length) return true;
      return catHit || interestHit;
    });
    const list = matches.length ? matches : pool;
    return {
      programs: list,
      sources: [...new Set(list.map((p) => p.priceSource.url))].map((url) => ({ label: url.replace(/^https?:\/\//, ""), url })),
    };
  },
};

// ───────────────────────── Verifier ─────────────────────────

export const mockVerifier: Verifier = {
  verify(program) {
    // Phase 2: fetch school pages as *untrusted data*, extract facts with a
    // constrained schema, and cross-check price/dates against sources.
    return getSchool(program.schoolId)!.verification;
  },
};

// ───────────────────────── Logistics ─────────────────────────

export const mockLogistics: Logistics = {
  visa: getVisaRule,
  estimate: estimateTrip,
};

// ───────────────────────── Fit ─────────────────────────

export const mockFit: Fit = {
  evaluate(list, req, profile) {
    return rankPrograms(list.map((p) => evaluateProgram(p, req, profile)));
  },
};

// ───────────────────────── Application ─────────────────────────

export const mockApplication: Application = {
  draftInquiry(proposal, profile, req) {
    const p = getProgram(proposal.programId)!;
    const school = getSchool(p.schoolId)!;
    const lang: Lang = profile.lang;
    const session = p.sessions.find((s) => (req.months ?? []).includes(new Date(s.start).getUTCMonth())) ?? p.sessions.find((s) => s.start > MOCK_TODAY);
    const when = session ? `${date(session.start, lang)} – ${date(session.end, lang)}` : lang === "es" ? "las próximas fechas disponibles" : "your next available dates";
    const qs = proposal.questions.map((q) => `• ${q}`).join("\n");
    const name = profile.name || (lang === "es" ? "[Tu nombre]" : "[Your name]");
    const body =
      lang === "es"
        ? `Hola, equipo de ${school.name}:\n\nMe llamo ${name} y vivo en ${profile.homeCity || "[ciudad]"}. Me interesa el programa "${p.title.es}" para ${when}${req.weeks ? ` (${req.weeks} semanas)` : ""}.\n\nAntes de inscribirme, ¿podrían confirmarme lo siguiente?\n${qs}\n\nMuchas gracias,\n${name}`
        : `Hello ${school.name} team,\n\nMy name is ${name} and I live in ${profile.homeCity || "[city]"}. I'm interested in "${p.title.en}" for ${when}${req.weeks ? ` (${req.weeks} weeks)` : ""}.\n\nBefore I apply, could you please confirm the following?\n${qs}\n\nThank you,\n${name}`;
    return {
      id: uid("draft"),
      to: school.email,
      subject: lang === "es" ? `Consulta: ${p.title.es}` : `Inquiry: ${p.title.en}`,
      body,
      status: "draft",
      createdAt: MOCK_TODAY,
    } satisfies DraftMessage;
  },
};

export function defaultQuestions(programId: string, profile: Profile, lang: Lang): string[] {
  const p = getProgram(programId)!;
  const school = getSchool(p.schoolId)!;
  const qs: L[] = [
    both("Is there space in the session I'm interested in?", "¿Hay plazas en la sesión que me interesa?"),
    both("What is the total price including registration and any other fees?", "¿Cuál es el precio total con inscripción y otras tarifas?"),
    both("Could you send your refund and cancellation policy in writing?", "¿Podrían enviarme por escrito la política de reembolso y cancelación?"),
  ];
  if (p.housing.some((h) => h.type === "homestay")) {
    qs.push(both("Can the homestay accommodate my dietary preferences?", "¿La familia anfitriona puede adaptarse a mis preferencias alimentarias?"));
  }
  if (p.category === "languages") qs.push(both("How do you assess my level before I arrive?", "¿Cómo evalúan mi nivel antes de llegar?"));
  if (profile.accessibility.length) qs.push(both("Can you confirm step-free access to classrooms and housing?", "¿Pueden confirmar acceso sin escalones a aulas y alojamiento?"));
  if (school.verification.status === "unverified") qs.push(both("Could you share your business registration details?", "¿Podrían compartir sus datos de registro mercantil?"));
  return qs.map((q) => q[lang]);
}

// ───────────────────────── Orchestrator ─────────────────────────

const FOLLOW_UPS: Record<MissingField, { q: L; chips: { label: L; value: L }[] }> = {
  dates: {
    q: both("When would you like to go, and for how long?", "¿Cuándo te gustaría ir y por cuánto tiempo?"),
    chips: [
      { label: both("2 weeks in July", "2 semanas en julio"), value: both("2 weeks in July", "2 semanas en julio") },
      { label: both("This winter", "Este invierno"), value: both("winter", "invierno") },
      { label: both("Spring 2027", "Primavera 2027"), value: both("spring", "primavera") },
      { label: both("I'm flexible", "Soy flexible"), value: both("I'm flexible on dates", "Soy flexible con las fechas") },
    ],
  },
  budget: {
    q: both("What's your total budget, not counting flights?", "¿Cuál es tu presupuesto total, sin contar vuelos?"),
    chips: [
      { label: both("Under $1,500", "Menos de $1,500"), value: both("$1,500", "$1,500") },
      { label: both("Around $2,500", "Unos $2,500"), value: both("$2,500", "$2,500") },
      { label: both("Up to $4,000", "Hasta $4,000"), value: both("$4,000", "$4,000") },
    ],
  },
  passport: {
    q: both("Which country issued your passport? (Country only — I never need ID numbers.)", "¿Qué país emitió tu pasaporte? (Solo el país: nunca necesito números de documento.)"),
    chips: [],
  },
  level: {
    q: both("What's your current level in the language?", "¿Cuál es tu nivel actual del idioma?"),
    chips: [
      { label: both("Beginner (A1–A2)", "Principiante (A1–A2)"), value: both("beginner", "principiante") },
      { label: both("Intermediate (B1–B2)", "Intermedio (B1–B2)"), value: both("intermediate", "intermedio") },
      { label: both("Advanced (C1+)", "Avanzado (C1+)"), value: both("advanced", "avanzado") },
    ],
  },
};

function describeRequest(r: TravelRequest): L {
  const partsEn: string[] = [];
  const partsEs: string[] = [];
  if (r.weeks) {
    partsEn.push(`${r.weeks} week${r.weeks > 1 ? "s" : ""}`);
    partsEs.push(`${r.weeks} semana${r.weeks > 1 ? "s" : ""}`);
  }
  if (r.months?.length) {
    partsEn.push(r.months.map((m) => monthName(m, "en")).join("/"));
    partsEs.push(r.months.map((m) => monthName(m, "es")).join("/"));
  }
  if (r.budget) {
    partsEn.push(`up to ${money(r.budget, "en")}`);
    partsEs.push(`hasta ${money(r.budget, "es")}`);
  }
  if (r.categories?.length) {
    partsEn.push(r.categories.map((c) => categories.find((x) => x.id === c)!.name.en).join(" + "));
    partsEs.push(r.categories.map((c) => categories.find((x) => x.id === c)!.name.es).join(" + "));
  }
  if (r.destinations?.length && r.destinations.length <= 3) {
    const names = r.destinations.map((d) => getDestination(d)!.name).join(", ");
    partsEn.push(`in ${names}`);
    partsEs.push(`en ${names}`);
  }
  return both(partsEn.join(" · "), partsEs.join(" · "));
}

export interface TurnResult {
  parts: ChatPart[];
  state: SharedState;
}

function proposalFor(programId: string, profile: Profile): ActionProposal {
  const school = getSchool(getProgram(programId)!.schoolId)!;
  return {
    id: uid("prop"),
    kind: "draft-inquiry",
    programId,
    to: school.email,
    questions: defaultQuestions(programId, profile, profile.lang),
    status: "pending",
  };
}

export function runTurn(message: string, state: SharedState, ctx: PlannerContext): TurnResult {
  const plan = mockPlanner.plan(message, state, ctx);
  const { profile } = ctx;

  if (plan.next === "reset") {
    return {
      parts: [{ type: "text", text: both("Fresh start! What would you like to learn, and where?", "¡Empecemos de nuevo! ¿Qué te gustaría aprender y dónde?") }],
      state: emptyState,
    };
  }

  if (plan.next === "compare") {
    const results = state.lastResults.slice(0, 3).map((id) => evaluateProgram(getProgram(id)!, state.request, profile));
    return {
      parts: [
        { type: "text", text: both("Here's a side-by-side of your top options:", "Aquí tienes una comparación de tus mejores opciones:") },
        { type: "compare", results },
      ],
      state,
    };
  }

  if (plan.next === "draft") {
    const top = state.lastResults[0];
    return {
      parts: [
        { type: "text", text: both("I can draft an inquiry for your top pick. Nothing is sent — review the plan first:", "Puedo redactar una consulta para tu mejor opción. No se envía nada; revisa el plan primero:") },
        { type: "proposal", proposal: proposalFor(top, profile) },
      ],
      state,
    };
  }

  if (plan.next === "ask") {
    const field = plan.missing[0];
    const parts: ChatPart[] = [];
    if (!plan.request.categories?.length && !plan.request.destinations?.length) {
      parts.push({
        type: "text",
        text: both(
          "I'd love to help! Tell me what you'd like to learn (a language, cooking, art…), roughly when, and your budget — or tap a suggestion.",
          "¡Me encantaría ayudarte! Cuéntame qué te gustaría aprender (un idioma, cocina, arte…), más o menos cuándo y tu presupuesto, o elige una sugerencia.",
        ),
      });
      return { parts, state: { ...state, request: plan.request } };
    }
    const summary = describeRequest(plan.request);
    parts.push({
      type: "text",
      text: both(`Great — ${summary.en || "let's find something"}. One quick question so I don't guess:`, `Genial: ${summary.es || "busquemos algo"}. Una pregunta rápida para no adivinar:`),
    });
    parts.push({ type: "text", text: FOLLOW_UPS[field].q });
    const chips = [...FOLLOW_UPS[field].chips, { label: both("Just show me options", "Solo muéstrame opciones"), value: both("Just show me options", "Muéstrame opciones") }];
    parts.push({ type: "chips", chips });
    return { parts, state: { ...state, request: plan.request, asked: [...state.asked, field] } };
  }

  // Search: Scout → Verifier → Logistics → Fit
  const found = mockScout.find(plan.request);
  const verifications = found.programs.map((p) => mockVerifier.verify(p));
  const verifiedCount = verifications.filter((v) => v.status === "verified").length;
  const riskCount = verifications.filter((v) => v.status === "risk").length;
  const ranked = mockFit.evaluate(found.programs, plan.request, profile);
  const good = ranked.filter((r) => r.status !== "none").slice(0, 4);
  const flagged = ranked.filter((r) => r.status === "none" && r.riskFlags.length).slice(0, 1);
  const otherMisses = ranked.filter((r) => r.status === "none" && !r.riskFlags.length).slice(0, good.length ? 1 : 3);
  const strong = ranked.filter((r) => r.status === "strong").length;
  const partial = ranked.filter((r) => r.status === "partial").length;

  const steps: AgentStep[] = [
    { agent: "planner", summary: describeRequest(plan.request) },
    { agent: "scout", summary: both(`Searched ${programs.length} programs in Juni's database → ${found.programs.length} candidates`, `Busqué en ${programs.length} programas de Juni → ${found.programs.length} candidatos`) },
    { agent: "verifier", summary: both(`Checked ${found.programs.length} schools: ${verifiedCount} verified, ${riskCount} with risk flags`, `Revisé ${found.programs.length} escuelas: ${verifiedCount} verificadas, ${riskCount} con alertas`) },
    { agent: "logistics", summary: both(`Estimated total trip costs${plan.request.passport ? ` and visa rules for a ${plan.request.passport} passport` : ""}`, `Calculé costos totales${plan.request.passport ? ` y requisitos de visa para pasaporte ${plan.request.passport}` : ""}`) },
    { agent: "fit", summary: both(`Ranked: ${strong} strong, ${partial} partial, ${ranked.length - strong - partial} don't fit`, `Clasificación: ${strong} encajan bien, ${partial} en parte, ${ranked.length - strong - partial} no encajan`) },
  ];

  const parts: ChatPart[] = [];
  const summary = describeRequest(plan.request);
  if (good.length) {
    parts.push({
      type: "text",
      text: both(
        `Here's your shortlist for ${summary.en}. Each option shows why it fits, the total estimate and its sources.`,
        `Esta es tu selección para ${summary.es}. Cada opción muestra por qué encaja, el costo total estimado y sus fuentes.`,
      ),
    });
  } else {
    parts.push({
      type: "text",
      text: both(
        `I couldn't find anything that fully fits ${summary.en}. Here's what came closest and why — try more flexible dates or a higher budget?`,
        `No encontré nada que encaje del todo con ${summary.es}. Esto es lo más cercano y por qué. ¿Pruebas con fechas más flexibles o más presupuesto?`,
      ),
    });
  }
  if (plan.assumptions.length) {
    parts.push({
      type: "text",
      text: both(`I used: ${plan.assumptions.map((a) => a.en).join("; ")}. Edit these in Profile anytime.`, `Usé: ${plan.assumptions.map((a) => a.es).join("; ")}. Puedes editarlo en tu Perfil.`),
    });
  }
  parts.push({ type: "steps", steps });
  parts.push({ type: "results", results: [...good, ...otherMisses], flagged });
  if (good[0]) parts.push({ type: "cost", result: good[0] });
  if (good.length >= 2) parts.push({ type: "compare", results: good.slice(0, 3) });
  if (flagged.length) {
    parts.push({
      type: "text",
      text: both(
        "⚠️ I also found a listing with scam red flags and left it out of your shortlist. See it above under \"Flagged by Juni\" so you can recognize similar offers.",
        "⚠️ También encontré un anuncio con señales de estafa y lo dejé fuera. Lo verás arriba en \"Marcado por Juni\" para que reconozcas ofertas parecidas.",
      ),
    });
  }
  if (good[0]) {
    parts.push({
      type: "text",
      text: both(
        "Want me to draft an inquiry to your top pick? I'll show you the plan first — nothing is drafted or sent without your approval.",
        "¿Quieres que redacte una consulta para tu mejor opción? Primero te muestro el plan; no redacto ni envío nada sin tu aprobación.",
      ),
    });
    parts.push({ type: "proposal", proposal: proposalFor(good[0].programId, profile) });
  }

  return {
    parts,
    state: { request: plan.request, asked: state.asked, lastResults: good.map((r) => r.programId) },
  };
}

/** "Ask Juni about this program" — a focused review of one listing. */
export function focusTurn(programId: string, ctx: PlannerContext, state: SharedState): TurnResult {
  const p = getProgram(programId);
  if (!p) return { parts: [{ type: "text", text: both("I couldn't find that program.", "No encontré ese programa.") }], state };
  const { profile } = ctx;
  const req: TravelRequest = { ...state.request, passport: state.request.passport ?? (profile.passport || undefined), budget: state.request.budget ?? profile.budgetMax };
  const result = evaluateProgram(p, req, profile);
  const school = getSchool(p.schoolId)!;
  const dest = getDestination(p.destinationId)!;
  const visa = getVisaRule(dest.countryCode, req.passport ?? "");
  const parts: ChatPart[] = [];

  if (school.verification.status === "risk") {
    parts.push({
      type: "text",
      text: both(
        `I'd steer clear of "${p.title.en}". ${school.name} failed my checks: ${result.riskFlags.map((f) => f.en.toLowerCase()).join(", ")}. Never pay by wire transfer to a school you can't verify.`,
        `Te recomiendo evitar "${p.title.es}". ${school.name} no superó mis revisiones: ${result.riskFlags.map((f) => f.es.toLowerCase()).join(", ")}. Nunca pagues por transferencia a una escuela que no puedas verificar.`,
      ),
    });
    parts.push({ type: "results", results: [], flagged: [result] });
    const alternatives = mockFit
      .evaluate(programs.filter((x) => x.category === p.category && x.id !== p.id && getSchool(x.schoolId)!.verification.status === "verified"), { ...req, months: [] }, profile)
      .slice(0, 2);
    if (alternatives.length) {
      parts.push({ type: "text", text: both("Verified alternatives in the same category:", "Alternativas verificadas en la misma categoría:") });
      parts.push({ type: "results", results: alternatives, flagged: [] });
    }
    return { parts, state: { ...state, lastResults: alternatives.map((a) => a.programId) } };
  }

  parts.push({
    type: "text",
    text: both(
      `Here's my honest read on "${p.title.en}" at ${school.name} in ${dest.name}, checked against your profile.`,
      `Esta es mi opinión honesta sobre "${p.title.es}" en ${school.name}, ${dest.name}, comparado con tu perfil.`,
    ),
  });
  parts.push({ type: "results", results: [result], flagged: [] });
  parts.push({ type: "cost", result });
  if (visa) {
    parts.push({
      type: "text",
      text: both(
        `Visa (${req.passport} passport → ${dest.country.en}): ${visa.note.en} Confirm with the official embassy or consulate.`,
        `Visa (pasaporte ${req.passport} → ${dest.country.es}): ${visa.note.es} Confírmalo con la embajada o el consulado oficial.`,
      ),
    });
  }
  parts.push({
    type: "text",
    text: both("Want me to draft an inquiry to the school? Review the plan first:", "¿Quieres que redacte una consulta a la escuela? Revisa el plan primero:"),
  });
  parts.push({ type: "proposal", proposal: proposalFor(p.id, profile) });
  return { parts, state: { ...state, request: req, lastResults: [p.id] } };
}

export function greeting(name: string): ChatPart[] {
  return [
    {
      type: "text",
      text: both(
        `Hi${name ? ` ${name}` : ""}! I'm Juni. Tell me what you'd love to learn abroad — how long, when, and your budget — and I'll build a verified shortlist. I never book, pay or send anything without your OK.`,
        `¡Hola${name ? ` ${name}` : ""}! Soy Juni. Cuéntame qué te gustaría aprender en el extranjero —cuánto tiempo, cuándo y tu presupuesto— y te armaré una selección verificada. Nunca reservo, pago ni envío nada sin tu permiso.`,
      ),
    },
  ];
}
