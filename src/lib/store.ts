// Client-side app state persisted to localStorage. Phase 2 replaces the
// persistence layer with the API; components only use the hooks below.

import { useSyncExternalStore } from "react";
import { seedExperiences, seedNotifications, seedProfile, seedTrips } from "@/data/seed-user";
import { getProgram } from "@/data/programs";
import { emptyState } from "./agents/mock";
import type { SharedState } from "./agents/types";
import type { ChatMessage } from "./chat";
import { defaultHousing, defaultWeeks, estimateTrip } from "./estimate";
import { nextSession } from "./fit";
import { uid } from "./format";
import type { AppNotification, DraftMessage, Experience, Lang, Profile, Trip, TripStatus } from "./types";

export interface AppState {
  version: number;
  profile: Profile;
  savedPrograms: string[];
  savedDestinations: string[];
  compare: string[];
  trips: Trip[];
  experiences: Experience[];
  notifications: AppNotification[];
  chat: { messages: ChatMessage[]; agent: SharedState; thinking: boolean };
}

const STORAGE_KEY = "juni:v1";
const VERSION = 1;

const initialState: AppState = {
  version: VERSION,
  profile: seedProfile,
  savedPrograms: ["kyoto-washoku", "lisbon-fado"],
  savedDestinations: ["oaxaca"],
  compare: [],
  trips: seedTrips,
  experiences: seedExperiences,
  notifications: seedNotifications,
  chat: { messages: [], agent: emptyState, thinking: false },
};

let state: AppState = initialState;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      if (parsed.version === VERSION) state = { ...initialState, ...parsed, chat: { ...parsed.chat, thinking: false } };
    }
  } catch {
    // Storage unavailable (private mode, blocked) — keep in-memory state.
  }
}

function persist() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export function setState(update: (s: AppState) => AppState) {
  load();
  state = update(state);
  persist();
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY && e.newValue) {
      state = JSON.parse(e.newValue);
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** Current state outside React (event handlers, timers). */
export function getState(): AppState {
  load();
  return state;
}

function getSnapshot() {
  load();
  return state;
}

function getServerSnapshot() {
  return initialState;
}

export function useAppState<T>(selector: (s: AppState) => T): T {
  const s = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return selector(s);
}

export function useLang(): Lang {
  return useAppState((s) => s.profile.lang);
}

// ───────────── actions ─────────────

export const actions = {
  setLang(lang: Lang) {
    setState((s) => ({ ...s, profile: { ...s.profile, lang } }));
  },
  updateProfile(patch: Partial<Profile>) {
    setState((s) => ({ ...s, profile: { ...s.profile, ...patch } }));
  },
  toggleSavedProgram(id: string) {
    setState((s) => ({
      ...s,
      savedPrograms: s.savedPrograms.includes(id) ? s.savedPrograms.filter((x) => x !== id) : [...s.savedPrograms, id],
    }));
  },
  toggleSavedDestination(id: string) {
    setState((s) => ({
      ...s,
      savedDestinations: s.savedDestinations.includes(id) ? s.savedDestinations.filter((x) => x !== id) : [...s.savedDestinations, id],
    }));
  },
  /** Returns false when the compare tray is already full (max 3). */
  toggleCompare(id: string): boolean {
    let ok = true;
    setState((s) => {
      if (s.compare.includes(id)) return { ...s, compare: s.compare.filter((x) => x !== id) };
      if (s.compare.length >= 3) {
        ok = false;
        return s;
      }
      return { ...s, compare: [...s.compare, id] };
    });
    return ok;
  },
  clearCompare() {
    setState((s) => ({ ...s, compare: [] }));
  },
  /** Adds a program to My Trips (status Saved) or returns the existing trip id. */
  addTrip(programId: string, status: TripStatus = "saved"): string {
    let id = "";
    setState((s) => {
      const existing = s.trips.find((t) => t.programId === programId && t.status !== "completed");
      if (existing) {
        id = existing.id;
        return s;
      }
      const p = getProgram(programId)!;
      const weeks = defaultWeeks(p);
      const housingType = defaultHousing(p, s.profile.housing);
      const est = estimateTrip(p, weeks, housingType);
      id = uid("trip");
      const trip: Trip = {
        id,
        programId,
        sessionId: nextSession(p)?.id ?? p.sessions[0].id,
        status,
        weeks,
        housingType,
        reminders: true,
        checklist: defaultChecklist(),
        budget: [
          { id: "b1", label: { en: "Tuition", es: "Matrícula" }, planned: est.tuition, actual: null },
          { id: "b2", label: { en: "Registration fee", es: "Inscripción" }, planned: est.registration, actual: null },
          { id: "b3", label: { en: "Housing", es: "Alojamiento" }, planned: est.housing, actual: null },
          { id: "b4", label: { en: "Living costs", es: "Gastos diarios" }, planned: est.living, actual: null },
          { id: "b5", label: { en: "Flights", es: "Vuelos" }, planned: 0, actual: null },
        ],
        drafts: [],
      };
      return { ...s, trips: [trip, ...s.trips] };
    });
    return id;
  },
  updateTrip(id: string, update: (t: Trip) => Trip) {
    setState((s) => ({ ...s, trips: s.trips.map((t) => (t.id === id ? update(t) : t)) }));
  },
  removeTrip(id: string) {
    setState((s) => ({ ...s, trips: s.trips.filter((t) => t.id !== id) }));
  },
  saveDraft(programId: string, draft: DraftMessage): string {
    const tripId = actions.addTrip(programId, "planning");
    actions.updateTrip(tripId, (t) => ({
      ...t,
      status: t.status === "saved" ? "planning" : t.status,
      drafts: [draft, ...t.drafts.filter((d) => d.id !== draft.id)],
    }));
    return tripId;
  },
  /** Marks a trip completed and creates a matching experience. */
  completeTrip(id: string) {
    setState((s) => {
      const trip = s.trips.find((t) => t.id === id);
      if (!trip) return s;
      const p = getProgram(trip.programId)!;
      const session = p.sessions.find((x) => x.id === trip.sessionId) ?? p.sessions[0];
      const exp: Experience = {
        id: uid("exp"),
        programId: p.id,
        start: session.start,
        end: session.end,
        photos: [{ src: p.image, alt: p.imageAlt.en }],
        certificate: p.certificate ? { title: p.title.en, issuedBy: p.schoolId, date: session.end, hours: p.hoursPerWeek * trip.weeks } : null,
        skills: [],
        journal: [],
        review: null,
      };
      return {
        ...s,
        trips: s.trips.map((t) => (t.id === id ? { ...t, status: "completed" } : t)),
        experiences: [exp, ...s.experiences],
      };
    });
  },
  updateExperience(id: string, update: (e: Experience) => Experience) {
    setState((s) => ({ ...s, experiences: s.experiences.map((e) => (e.id === id ? update(e) : e)) }));
  },
  markNotification(id: string, read = true) {
    setState((s) => ({ ...s, notifications: s.notifications.map((n) => (n.id === id ? { ...n, read } : n)) }));
  },
  markAllNotificationsRead() {
    setState((s) => ({ ...s, notifications: s.notifications.map((n) => ({ ...n, read: true })) }));
  },
  setChat(update: (c: AppState["chat"]) => AppState["chat"]) {
    setState((s) => ({ ...s, chat: update(s.chat) }));
  },
  resetDemo() {
    setState(() => initialState);
  },
};

function defaultChecklist(): Trip["checklist"] {
  return [
    { id: uid("c"), group: "documents", label: { en: "Passport valid 6+ months after return", es: "Pasaporte vigente 6+ meses después del regreso" }, done: false },
    { id: uid("c"), group: "visa", label: { en: "Check visa rules and confirm with the embassy", es: "Revisar requisitos de visa y confirmar con la embajada" }, done: false },
    { id: uid("c"), group: "insurance", label: { en: "Buy travel medical insurance", es: "Contratar seguro médico de viaje" }, done: false },
    { id: uid("c"), group: "payments", label: { en: "Pay deposit by card (never wire-only)", es: "Pagar depósito con tarjeta (nunca solo transferencia)" }, done: false },
    { id: uid("c"), group: "packing", label: { en: "Packing list", es: "Lista de equipaje" }, done: false },
  ];
}
