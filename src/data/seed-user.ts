import type { AppNotification, Experience, Profile, Trip } from "@/lib/types";
import { photo } from "./photo";

// MOCK DATA — the demo traveler that ships with Phase 1.

export const seedProfile: Profile = {
  name: "Alex",
  lang: "en",
  homeCity: "Chicago",
  passport: "US",
  budgetMin: 1500,
  budgetMax: 3000,
  interests: ["languages", "cooking"],
  skills: [
    { label: "Spanish", level: "A2" },
    { label: "Home cooking", level: "Intermediate" },
  ],
  housing: ["homestay"],
  accessibility: [],
  dietary: ["Vegetarian-friendly"],
};

export const seedTrips: Trip[] = [
  {
    id: "trip-xela",
    programId: "xela-spanish-community",
    sessionId: "s3",
    status: "planning",
    weeks: 3,
    housingType: "homestay",
    reminders: true,
    checklist: [
      { id: "c1", group: "documents", label: { en: "Passport valid 6+ months after return", es: "Pasaporte vigente 6+ meses después del regreso" }, done: true },
      { id: "c2", group: "documents", label: { en: "Send placement questionnaire", es: "Enviar cuestionario de nivel" }, done: false, due: "2027-06-15" },
      { id: "c3", group: "visa", label: { en: "Confirm visa-free entry (CA-4) with the embassy", es: "Confirmar entrada sin visa (CA-4) con la embajada" }, done: false, due: "2027-05-01" },
      { id: "c4", group: "insurance", label: { en: "Buy travel medical insurance", es: "Contratar seguro médico de viaje" }, done: false, due: "2027-06-01" },
      { id: "c5", group: "payments", label: { en: "Pay $75 deposit by card", es: "Pagar depósito de $75 con tarjeta" }, done: false, due: "2027-06-14" },
      { id: "c6", group: "packing", label: { en: "Warm layers for cold mornings", es: "Ropa abrigada para las mañanas frías" }, done: false },
      { id: "c7", group: "packing", label: { en: "Rain jacket", es: "Impermeable" }, done: false },
    ],
    budget: [
      { id: "b1", label: { en: "Tuition", es: "Matrícula" }, planned: 525, actual: null },
      { id: "b2", label: { en: "Registration fee", es: "Inscripción" }, planned: 35, actual: 35 },
      { id: "b3", label: { en: "Homestay", es: "Familia anfitriona" }, planned: 330, actual: null },
      { id: "b4", label: { en: "Living costs", es: "Gastos diarios" }, planned: 300, actual: null },
      { id: "b5", label: { en: "Flights", es: "Vuelos" }, planned: 550, actual: 512 },
      { id: "b6", label: { en: "Insurance", es: "Seguro" }, planned: 60, actual: null },
    ],
    drafts: [],
  },
  {
    id: "trip-bologna",
    programId: "bologna-fresh-pasta",
    sessionId: "s2",
    status: "saved",
    weeks: 1,
    housingType: "residence",
    reminders: false,
    checklist: [],
    budget: [],
    drafts: [],
  },
];

export const seedExperiences: Experience[] = [
  {
    id: "exp-oaxaca",
    programId: "oaxaca-market-mole",
    start: "2026-02-09",
    end: "2026-02-20",
    photos: [
      { src: photo("photo-1504674900247-0877df9cc836"), alt: "Mole negro served on a clay plate" },
      { src: photo("photo-1547995886-6dc09384c6e6"), alt: "Colorful street in Oaxaca" },
    ],
    certificate: { title: "From Market to Mole — Certificate of Completion", issuedBy: "Cocina de Mercado Oaxaca", date: "2026-02-20", hours: 60 },
    skills: ["Mole negro", "Metate grinding", "Market Spanish", "Mezcal tasting"],
    journal: [
      { id: "j1", date: "2026-02-10", text: "First day at the market. Doña Rosa taught me to choose chilhuacles by smell." },
      { id: "j2", date: "2026-02-17", text: "Finally got the mole negro right. 26 ingredients, 6 hours, worth it." },
    ],
    review: null,
  },
];

export const seedNotifications: AppNotification[] = [
  {
    id: "n1",
    kind: "deadline",
    title: { en: "Deposit due in Xela", es: "Depósito pendiente en Xela" },
    body: { en: "Your $75 deposit for Spanish & Community Immersion is due June 14.", es: "Tu depósito de $75 para Español e inmersión comunitaria vence el 14 de junio." },
    date: "2026-10-05",
    href: "/trips?trip=trip-xela",
    read: false,
  },
  {
    id: "n2",
    kind: "price",
    title: { en: "Price drop: Thai Farm Cooking", es: "Bajó el precio: Cocina tailandesa en granja" },
    body: { en: "Now $260/week (was $285). Source checked Sep 29.", es: "Ahora $260/semana (antes $285). Fuente verificada el 29 de sep." },
    date: "2026-09-29",
    href: "/programs/chiangmai-farm-cooking",
    read: false,
  },
  {
    id: "n3",
    kind: "match",
    title: { en: "New match for you", es: "Nuevo programa para ti" },
    body: { en: "Italian Language & Cucina in Bologna matches your interests and budget.", es: "Italiano y cocina en Bolonia coincide con tus intereses y presupuesto." },
    date: "2026-09-21",
    href: "/programs/bologna-italian-cucina",
    read: true,
  },
];
