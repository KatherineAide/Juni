import { getDestination } from "@/data/destinations";
import type { HousingType, Program, TripEstimate } from "./types";

export function defaultWeeks(p: Program, wanted?: number): number {
  const w = wanted ?? Math.min(p.weeks.max, Math.max(p.weeks.min, 2));
  return Math.min(p.weeks.max, Math.max(p.weeks.min, w));
}

export function defaultHousing(p: Program, preferred: HousingType[] = []): HousingType {
  return p.housing.find((h) => preferred.includes(h.type))?.type ?? p.housing[0]?.type ?? "none";
}

/** Total trip cost estimate in USD, excluding flights. */
export function estimateTrip(p: Program, weeks: number, housingType: HousingType): TripEstimate {
  const dest = getDestination(p.destinationId)!;
  const housing = p.housing.find((h) => h.type === housingType) ?? p.housing[0];
  const livingWeekly = Math.round((dest.costs.living.min + dest.costs.living.max) / 2);
  // Homestays usually include most meals, so day-to-day spending is lower.
  const livingFactor = housing?.type === "homestay" || housing?.type === "none" ? 0.6 : 1;
  const tuition = p.pricePerWeek * weeks;
  const housingCost = (housing?.pricePerWeek ?? 0) * weeks;
  const living = Math.round(livingWeekly * livingFactor) * weeks;
  return {
    weeks,
    tuition,
    registration: p.registrationFee,
    housing: housingCost,
    living,
    total: tuition + p.registrationFee + housingCost + living,
    housingType: housing?.type ?? "none",
  };
}
