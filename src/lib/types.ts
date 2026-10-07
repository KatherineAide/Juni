// Core domain types for Juni. These mirror the initial PostgreSQL data model
// (see db/schema.sql) and the Phase 2 API contracts (see src/lib/agents/types.ts).

export type Lang = "en" | "es";

/** A string available in every supported UI language. */
export type L = Record<Lang, string>;

export type CategoryId =
  | "languages"
  | "cooking"
  | "art"
  | "architecture"
  | "anthropology"
  | "philosophy"
  | "history"
  | "music-dance"
  | "photo-film"
  | "writing"
  | "wellness"
  | "sustainability"
  | "volunteering";

export interface Category {
  id: CategoryId;
  name: L;
  blurb: L;
  image: string;
}

export type PassportCode =
  | "US"
  | "CA"
  | "GB"
  | "EU"
  | "MX"
  | "GT"
  | "BR"
  | "AR"
  | "CO"
  | "IN";

export type VisaStatus = "domestic" | "free-movement" | "visa-free" | "evisa" | "visa-required" | "check";

export interface VisaRule {
  status: VisaStatus;
  maxStayDays?: number;
  note: L;
}

export interface Source {
  label: string;
  url: string;
}

export interface MoneyRange {
  min: number;
  max: number;
}

export interface Destination {
  id: string;
  name: string;
  country: L;
  countryCode: string;
  region: L;
  image: string;
  imageAlt: L;
  tagline: L;
  overview: L;
  /** Typical weekly costs in USD. */
  costs: { course: MoneyRange; housing: MoneyRange; living: MoneyRange };
  currency: { code: string; perUsd: number; lastChecked: string; source: Source };
  bestSeasons: L;
  safety: L;
  accessibility: L;
  /** Map bounds used for the schematic school map. */
  center: { lat: number; lng: number };
}

export type CheckId =
  | "physical_address"
  | "payment_methods"
  | "refund_policy"
  | "independent_reviews"
  | "visa_claims"
  | "registration"
  | "price_crosscheck";

export type CheckResult = "pass" | "fail" | "unknown";

export interface VerificationCheck {
  id: CheckId;
  result: CheckResult;
  note: L;
}

export type VerificationStatus = "verified" | "unverified" | "risk";

export interface VerificationRecord {
  status: VerificationStatus;
  checks: VerificationCheck[];
  sources: Source[];
  lastChecked: string;
}

export interface School {
  id: string;
  name: string;
  destinationId: string;
  address: string | null;
  coords: { lat: number; lng: number } | null;
  website: string;
  email: string;
  founded: number | null;
  paymentMethods: string[];
  refundPolicy: L | null;
  verification: VerificationRecord;
}

export type Level = "beginner" | "intermediate" | "advanced" | "all";

export type HousingType = "homestay" | "residence" | "apartment" | "hostel" | "none";

export type AccessibilityTag = "step-free" | "accessible-housing" | "hearing-support" | "low-vision" | "flexible-pace";

export interface ProgramSession {
  id: string;
  start: string; // ISO date
  end: string;
  seatsLeft: number;
}

export interface HousingOption {
  type: HousingType;
  pricePerWeek: number;
  note?: L;
}

export interface Program {
  id: string;
  title: L;
  schoolId: string;
  destinationId: string;
  category: CategoryId;
  image: string;
  imageAlt: L;
  summary: L;
  description: L;
  schedule: L[];
  includes: L[];
  /** Allowed length in weeks. */
  weeks: { min: number; max: number };
  hoursPerWeek: number;
  level: Level;
  instructionLanguages: string[];
  /** Tuition in USD per week. */
  pricePerWeek: number;
  registrationFee: number;
  priceSource: Source;
  priceLastChecked: string;
  sessions: ProgramSession[];
  housing: HousingOption[];
  certificate: boolean;
  accessibility: AccessibilityTag[];
  rating: number | null;
  reviewCount: number;
  applicationDeadlineDays: number;
  minAge: number;
  tags: string[];
  sponsored?: boolean;
}

export interface Review {
  id: string;
  programId: string;
  author: string;
  homeCountry: string;
  lang: Lang;
  rating: number;
  date: string;
  text: string;
  verifiedParticipant: boolean;
}

export type FitStatus = "strong" | "partial" | "none";

export interface FitReason {
  ok: boolean | "partial";
  text: L;
}

export interface FitResult {
  programId: string;
  status: FitStatus;
  score: number;
  reasons: FitReason[];
  riskFlags: L[];
  estimate: TripEstimate;
  sessionId: string | null;
}

export interface TripEstimate {
  weeks: number;
  tuition: number;
  registration: number;
  housing: number;
  living: number;
  total: number;
  housingType: HousingType;
}

export interface Profile {
  name: string;
  lang: Lang;
  homeCity: string;
  passport: PassportCode | "";
  budgetMin: number;
  budgetMax: number;
  interests: CategoryId[];
  skills: { label: string; level: string }[];
  housing: HousingType[];
  accessibility: AccessibilityTag[];
  dietary: string[];
}

export type TripStatus = "saved" | "planning" | "applied" | "enrolled" | "completed";

export interface ChecklistItem {
  id: string;
  group: "documents" | "visa" | "insurance" | "payments" | "packing";
  label: L | string;
  done: boolean;
  due?: string;
}

export interface BudgetLine {
  id: string;
  label: L | string;
  planned: number;
  actual: number | null;
}

export interface DraftMessage {
  id: string;
  subject: string;
  body: string;
  to: string;
  status: "draft" | "approved" | "rejected";
  createdAt: string;
}

export interface Trip {
  id: string;
  programId: string;
  sessionId: string;
  status: TripStatus;
  weeks: number;
  housingType: HousingType;
  checklist: ChecklistItem[];
  budget: BudgetLine[];
  drafts: DraftMessage[];
  reminders: boolean;
}

export interface Experience {
  id: string;
  programId: string;
  start: string;
  end: string;
  photos: { src: string; alt: string }[];
  certificate: { title: string; issuedBy: string; date: string; hours: number } | null;
  skills: string[];
  journal: { id: string; date: string; text: string }[];
  review: { rating: number; text: string; date: string } | null;
}

export type NotificationKind = "deadline" | "price" | "match";

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: L;
  body: L;
  date: string;
  href: string;
  read: boolean;
}
