import { getCategory } from "@/data/categories";
import { getDestination } from "@/data/destinations";
import { getSchool } from "@/data/schools";
import { getVisaRule } from "@/data/visa";
import type { TravelRequest } from "./agents/types";
import { defaultHousing, defaultWeeks, estimateTrip } from "./estimate";
import { MOCK_TODAY } from "./mock-clock";
import { date, money, monthName } from "./format";
import type { CheckId, FitReason, FitResult, FitStatus, L, Profile, Program, ProgramSession } from "./types";

export const riskFlagText: Record<CheckId, L> = {
  payment_methods: { en: "Wire-transfer-only payment", es: "Pago solo por transferencia" },
  visa_claims: { en: "Misleading visa claims", es: "Promesas de visa engañosas" },
  physical_address: { en: "No physical address", es: "Sin dirección física" },
  refund_policy: { en: "No refund policy", es: "Sin política de reembolso" },
  independent_reviews: { en: "No independent reviews", es: "Sin reseñas independientes" },
  registration: { en: "No business registration found", es: "Sin registro mercantil" },
  price_crosscheck: { en: "Price doesn't match sources", es: "El precio no coincide con las fuentes" },
};

export function riskFlags(p: Program): L[] {
  const v = getSchool(p.schoolId)!.verification;
  return v.checks.filter((c) => c.result === "fail").map((c) => riskFlagText[c.id]);
}

export function upcomingSessions(p: Program): ProgramSession[] {
  return p.sessions.filter((s) => s.start > MOCK_TODAY);
}

export function nextSession(p: Program): ProgramSession | null {
  return upcomingSessions(p)[0] ?? null;
}

const both = (en: string, es: string): L => ({ en, es });

const levelRank = { beginner: 0, intermediate: 1, advanced: 2, all: -1 } as const;
const levelName = {
  beginner: both("beginner", "principiante"),
  intermediate: both("intermediate", "intermedio"),
  advanced: both("advanced", "avanzado"),
  all: both("all levels", "todos los niveles"),
} as const;

/** Infer a level from a CEFR code in the profile or request, e.g. "Spanish B1". */
export function cefrToLevel(code: string | undefined): "beginner" | "intermediate" | "advanced" | undefined {
  if (!code) return undefined;
  const m = code.toUpperCase().match(/[ABC][12]/);
  if (!m) return undefined;
  if (m[0].startsWith("A")) return "beginner";
  if (m[0].startsWith("B")) return "intermediate";
  return "advanced";
}

export function evaluateProgram(p: Program, req: TravelRequest, profile: Profile): FitResult {
  const reasons: FitReason[] = [];
  let hardFail = false;
  let partial = false;
  let score = 0;
  const dest = getDestination(p.destinationId)!;
  const school = getSchool(p.schoolId)!;
  const flags = riskFlags(p);

  // Verification is a hard constraint: risky schools never get recommended.
  if (school.verification.status === "risk") {
    hardFail = true;
    reasons.push({ ok: false, text: both("Failed verification — Juni won't recommend this school", "No superó la verificación: Juni no recomienda esta escuela") });
  } else if (school.verification.status === "unverified") {
    partial = true;
    reasons.push({ ok: "partial", text: both("School not fully verified yet — ask for refund terms in writing", "Escuela aún no verificada del todo: pide los términos de reembolso por escrito") });
  } else {
    score += 2;
    reasons.push({ ok: true, text: both("Verified school with a written refund policy", "Escuela verificada con política de reembolso por escrito") });
  }

  // Length
  const weeks = defaultWeeks(p, req.weeks);
  if (req.weeks) {
    if (req.weeks >= p.weeks.min && req.weeks <= p.weeks.max) {
      score += 2;
      reasons.push({ ok: true, text: both(`Runs for your ${req.weeks} weeks`, `Dura tus ${req.weeks} semanas`) });
    } else if (Math.abs(weeks - req.weeks) <= 1) {
      partial = true;
      reasons.push({ ok: "partial", text: both(`Offered for ${p.weeks.min}–${p.weeks.max} weeks (you asked for ${req.weeks})`, `Se ofrece de ${p.weeks.min} a ${p.weeks.max} semanas (pediste ${req.weeks})`) });
    } else {
      hardFail = true;
      reasons.push({ ok: false, text: both(`Only runs ${p.weeks.min}–${p.weeks.max} weeks`, `Solo dura de ${p.weeks.min} a ${p.weeks.max} semanas`) });
    }
  }

  // Dates
  const upcoming = upcomingSessions(p);
  let session: ProgramSession | null = upcoming[0] ?? null;
  if (req.months?.length) {
    const inMonth = upcoming.find((s) => req.months!.includes(new Date(s.start).getUTCMonth()));
    const monthsEn = req.months.map((m) => monthName(m, "en")).join("/");
    const monthsEs = req.months.map((m) => monthName(m, "es")).join("/");
    if (inMonth) {
      session = inMonth;
      score += 3;
      reasons.push({ ok: true, text: both(`Starts ${date(inMonth.start, "en")} — in ${monthsEn}`, `Empieza el ${date(inMonth.start, "es")}, en ${monthsEs}`) });
    } else {
      const near = upcoming.find((s) => req.months!.some((m) => Math.abs(new Date(s.start).getUTCMonth() - m) === 1));
      if (near) {
        session = near;
        partial = true;
        reasons.push({ ok: "partial", text: both(`Closest start is ${date(near.start, "en")}, outside ${monthsEn}`, `El inicio más cercano es el ${date(near.start, "es")}, fuera de ${monthsEs}`) });
      } else {
        hardFail = true;
        reasons.push({ ok: false, text: both(`No sessions in ${monthsEn}`, `No hay sesiones en ${monthsEs}`) });
      }
    }
  } else if (!session) {
    hardFail = true;
    reasons.push({ ok: false, text: both("No upcoming sessions", "No hay próximas sesiones") });
  }

  // Budget (hard constraint with 10% tolerance)
  const housingPref = req.housing ? [req.housing] : profile.housing;
  const estimate = estimateTrip(p, weeks, defaultHousing(p, housingPref));
  const budget = req.budget;
  if (budget) {
    if (estimate.total <= budget) {
      score += 3;
      reasons.push({ ok: true, text: both(`About ${money(estimate.total, "en")} total — within your ${money(budget, "en")}`, `Unos ${money(estimate.total, "es")} en total, dentro de tus ${money(budget, "es")}`) });
    } else if (estimate.total <= budget * 1.1) {
      partial = true;
      reasons.push({ ok: "partial", text: both(`About ${money(estimate.total, "en")} — slightly over your ${money(budget, "en")}`, `Unos ${money(estimate.total, "es")}, algo más de tus ${money(budget, "es")}`) });
    } else {
      hardFail = true;
      reasons.push({ ok: false, text: both(`About ${money(estimate.total, "en")} — over your ${money(budget, "en")}`, `Unos ${money(estimate.total, "es")}, supera tus ${money(budget, "es")}`) });
    }
  }

  // Level
  if (req.level && p.level !== "all" && req.level !== "all") {
    const diff = levelRank[p.level] - levelRank[req.level];
    if (diff === 0) {
      score += 1;
      reasons.push({ ok: true, text: both(`Matches your level (${levelName[req.level].en})`, `Coincide con tu nivel (${levelName[req.level].es})`) });
    } else if (diff > 0) {
      partial = diff === 1 ? true : partial;
      hardFail = diff > 1 ? true : hardFail;
      reasons.push({ ok: diff === 1 ? "partial" : false, text: both(`Designed for ${levelName[p.level].en} learners`, `Pensado para nivel ${levelName[p.level].es}`) });
    }
  } else if (p.level === "all") {
    score += 1;
    reasons.push({ ok: true, text: both("Open to all levels", "Abierto a todos los niveles") });
  }

  // Soft preferences: category and interests
  if (req.categories?.includes(p.category)) {
    score += 3;
    reasons.push({ ok: true, text: both(`${getCategory(p.category).name.en} — what you asked for`, `${getCategory(p.category).name.es}: lo que pediste`) });
  }
  const interestHits = (req.interests ?? []).filter((i) => p.tags.includes(i));
  if (interestHits.length) {
    score += interestHits.length * 1.5;
    reasons.push({ ok: true, text: both(`Matches your interests: ${interestHits.join(", ")}`, `Coincide con tus intereses: ${interestHits.join(", ")}`) });
  }
  if (profile.interests.includes(p.category)) score += 1;
  if (p.rating) score += (p.rating - 4) * 2;

  // Visa (soft: we flag, the embassy decides)
  const visa = getVisaRule(dest.countryCode, req.passport ?? profile.passport);
  if (visa && (visa.status === "visa-required" || visa.status === "check")) {
    partial = true;
    reasons.push({ ok: "partial", text: visa.status === "check" ? both("Visa rules unconfirmed for your passport", "Requisitos de visa sin confirmar para tu pasaporte") : both("You'll likely need a visa — allow extra time", "Probablemente necesitarás visa: calcula más tiempo") });
  }

  // Accessibility needs
  const needs = req.accessibility ?? profile.accessibility;
  const missing = needs.filter((a) => !p.accessibility.includes(a));
  if (needs.length && missing.length) {
    partial = true;
    reasons.push({ ok: "partial", text: both("Some of your accessibility needs aren't confirmed — ask the school", "Algunas necesidades de accesibilidad no están confirmadas: pregunta a la escuela") });
  }

  const status: FitStatus = hardFail ? "none" : partial ? "partial" : "strong";
  return {
    programId: p.id,
    status,
    score: hardFail ? score - 100 : partial ? score - 3 : score,
    reasons,
    riskFlags: flags,
    estimate,
    sessionId: session?.id ?? null,
  };
}

export function rankPrograms(results: FitResult[]): FitResult[] {
  return [...results].sort((a, b) => b.score - a.score);
}
