import type { L, PassportCode, VisaRule } from "@/lib/types";

// MOCK DATA — simplified short-stay tourist/study rules for Phase 1 only.
// The UI always pairs this with "Confirm with the official embassy or consulate."

export const passports: { code: PassportCode; name: L }[] = [
  { code: "US", name: { en: "United States", es: "Estados Unidos" } },
  { code: "CA", name: { en: "Canada", es: "Canadá" } },
  { code: "GB", name: { en: "United Kingdom", es: "Reino Unido" } },
  { code: "EU", name: { en: "EU / Schengen country", es: "País de la UE / Schengen" } },
  { code: "MX", name: { en: "Mexico", es: "México" } },
  { code: "GT", name: { en: "Guatemala", es: "Guatemala" } },
  { code: "BR", name: { en: "Brazil", es: "Brasil" } },
  { code: "AR", name: { en: "Argentina", es: "Argentina" } },
  { code: "CO", name: { en: "Colombia", es: "Colombia" } },
  { code: "IN", name: { en: "India", es: "India" } },
];

export const VISA_LAST_CHECKED = "2026-09-15";

const schengenFree: VisaRule = {
  status: "visa-free",
  maxStayDays: 90,
  note: {
    en: "Up to 90 days in any 180-day period across the Schengen area. A pre-travel authorization (ETIAS) may be required — check its current status.",
    es: "Hasta 90 días en cualquier periodo de 180 días en el espacio Schengen. Puede requerirse una autorización previa (ETIAS); verifica su estado actual.",
  },
};
const schengenEU: VisaRule = {
  status: "free-movement",
  note: { en: "EU/Schengen citizens can study short-term with a national ID or passport.", es: "Los ciudadanos de la UE/Schengen pueden estudiar con documento nacional o pasaporte." },
};
const schengenVisa: VisaRule = {
  status: "visa-required",
  maxStayDays: 90,
  note: {
    en: "A Schengen short-stay (type C) visa is usually required. Apply at the consulate of your main destination; allow 4–8 weeks.",
    es: "Normalmente se requiere visado Schengen de corta duración (tipo C). Solicítalo en el consulado de tu destino principal; calcula de 4 a 8 semanas.",
  },
};
const check: VisaRule = {
  status: "check",
  note: { en: "We don't have verified information for this combination yet.", es: "Aún no tenemos información verificada para esta combinación." },
};

const schengen: Partial<Record<PassportCode, VisaRule>> = {
  US: schengenFree, CA: schengenFree, GB: schengenFree, EU: schengenEU, MX: schengenFree,
  GT: schengenFree, BR: schengenFree, AR: schengenFree, CO: schengenFree, IN: schengenVisa,
};

const ca4Free: VisaRule = {
  status: "visa-free",
  maxStayDays: 90,
  note: {
    en: "Typically visa-free for up to 90 days, shared across Guatemala, El Salvador, Honduras and Nicaragua (CA-4).",
    es: "Normalmente sin visa hasta 90 días, compartidos entre Guatemala, El Salvador, Honduras y Nicaragua (CA-4).",
  },
};

export const visaRules: Record<string, Partial<Record<PassportCode, VisaRule>>> = {
  GT: {
    US: ca4Free, CA: ca4Free, GB: ca4Free, EU: ca4Free, MX: ca4Free, BR: ca4Free, AR: ca4Free, CO: ca4Free,
    GT: { status: "domestic", note: { en: "No visa needed in your own country.", es: "No necesitas visa en tu propio país." } },
    IN: {
      status: "visa-required",
      note: {
        en: "A visa is generally required, though holders of certain valid US, Canadian or Schengen visas may be exempt.",
        es: "Generalmente se requiere visa, aunque quienes tienen ciertas visas vigentes de EE. UU., Canadá o Schengen pueden estar exentos.",
      },
    },
  },
  MX: {
    US: { status: "visa-free", maxStayDays: 180, note: { en: "Visa-free; the immigration officer decides the number of days granted (up to 180).", es: "Sin visa; el agente migratorio decide cuántos días otorga (hasta 180)." } },
    CA: { status: "visa-free", maxStayDays: 180, note: { en: "Visa-free; the officer decides the days granted (up to 180).", es: "Sin visa; el agente decide los días otorgados (hasta 180)." } },
    GB: { status: "visa-free", maxStayDays: 180, note: { en: "Visa-free; the officer decides the days granted (up to 180).", es: "Sin visa; el agente decide los días otorgados (hasta 180)." } },
    EU: { status: "visa-free", maxStayDays: 180, note: { en: "Visa-free for most EU passports.", es: "Sin visa para la mayoría de pasaportes de la UE." } },
    MX: { status: "domestic", note: { en: "No visa needed in your own country.", es: "No necesitas visa en tu propio país." } },
    AR: { status: "visa-free", maxStayDays: 180, note: { en: "Visa-free for tourist stays.", es: "Sin visa para estancias turísticas." } },
    CO: { status: "visa-free", maxStayDays: 180, note: { en: "Visa-free, but entry checks can be strict; carry proof of funds and return ticket.", es: "Sin visa, pero los controles pueden ser estrictos; lleva comprobante de fondos y boleto de regreso." } },
    GT: { status: "visa-required", note: { en: "A visa is generally required unless you hold certain valid US, Canadian, UK, Japanese or Schengen visas.", es: "Generalmente se requiere visa salvo que tengas ciertas visas vigentes de EE. UU., Canadá, Reino Unido, Japón o Schengen." } },
    BR: { status: "evisa", note: { en: "An electronic visa or a regular visa is required.", es: "Se requiere visa electrónica o visa ordinaria." } },
    IN: { status: "visa-required", note: { en: "A visa is generally required unless you hold certain valid US, Canadian, UK, Japanese or Schengen visas.", es: "Generalmente se requiere visa salvo que tengas ciertas visas vigentes de EE. UU., Canadá, Reino Unido, Japón o Schengen." } },
  },
  IT: schengen,
  ES: schengen,
  PT: schengen,
  GR: schengen,
  JP: {
    US: { status: "visa-free", maxStayDays: 90, note: { en: "Visa-exempt short stay. Short courses under 90 days are usually allowed; longer study needs a student visa.", es: "Estancia corta sin visa. Los cursos de menos de 90 días suelen estar permitidos; estudios más largos requieren visa de estudiante." } },
    CA: { status: "visa-free", maxStayDays: 90, note: { en: "Visa-exempt short stay.", es: "Estancia corta sin visa." } },
    GB: { status: "visa-free", maxStayDays: 90, note: { en: "Visa-exempt short stay.", es: "Estancia corta sin visa." } },
    EU: { status: "visa-free", maxStayDays: 90, note: { en: "Visa-exempt for most EU passports.", es: "Sin visa para la mayoría de pasaportes de la UE." } },
    MX: { status: "visa-free", maxStayDays: 90, note: { en: "Visa-exempt short stay.", es: "Estancia corta sin visa." } },
    AR: { status: "visa-free", maxStayDays: 90, note: { en: "Visa-exempt short stay.", es: "Estancia corta sin visa." } },
    BR: { status: "evisa", maxStayDays: 90, note: { en: "Apply for a Japan eVisa before travel.", es: "Solicita la eVisa de Japón antes de viajar." } },
    IN: { status: "evisa", maxStayDays: 90, note: { en: "Apply for a Japan eVisa before travel.", es: "Solicita la eVisa de Japón antes de viajar." } },
    GT: check,
    CO: check,
  },
  TH: {
    US: { status: "visa-free", note: { en: "Visa exemption for short stays. The permitted length has changed recently — confirm before booking.", es: "Exención de visa para estancias cortas. La duración permitida cambió recientemente; confírmala antes de reservar." } },
    CA: { status: "visa-free", note: { en: "Visa exemption for short stays; confirm the current length.", es: "Exención de visa para estancias cortas; confirma la duración actual." } },
    GB: { status: "visa-free", note: { en: "Visa exemption for short stays; confirm the current length.", es: "Exención de visa para estancias cortas; confirma la duración actual." } },
    EU: { status: "visa-free", note: { en: "Visa exemption for most EU passports; confirm the current length.", es: "Exención de visa para la mayoría de pasaportes de la UE; confirma la duración actual." } },
    MX: { status: "visa-free", note: { en: "Visa exemption for short stays; confirm the current length.", es: "Exención de visa para estancias cortas; confirma la duración actual." } },
    BR: { status: "visa-free", note: { en: "Visa exemption for short stays; confirm the current length.", es: "Exención de visa para estancias cortas; confirma la duración actual." } },
    AR: { status: "visa-free", note: { en: "Visa exemption for short stays; confirm the current length.", es: "Exención de visa para estancias cortas; confirma la duración actual." } },
    CO: { status: "visa-free", note: { en: "Visa exemption for short stays; confirm the current length.", es: "Exención de visa para estancias cortas; confirma la duración actual." } },
    IN: { status: "visa-free", note: { en: "Visa exemption or visa on arrival, depending on current policy.", es: "Exención de visa o visa a la llegada, según la política vigente." } },
    GT: check,
  },
};

export function getVisaRule(countryCode: string, passport: PassportCode | ""): VisaRule | null {
  if (!passport) return null;
  return visaRules[countryCode]?.[passport] ?? check;
}
