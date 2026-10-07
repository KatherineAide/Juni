// Exports the Phase 1 seed dataset to JSON for the Phase 2 backend.
// Run with: npm run export-seed
import { writeFileSync } from "node:fs";
import { categories } from "../src/data/categories";
import { destinations } from "../src/data/destinations";
import { programs } from "../src/data/programs";
import { reviews } from "../src/data/reviews";
import { schools } from "../src/data/schools";
import { passports, VISA_LAST_CHECKED, visaRules } from "../src/data/visa";
import { MOCK_TODAY } from "../src/lib/mock-clock";

const out = "backend/juni/data/seed.json";
writeFileSync(
  out,
  JSON.stringify({ today: MOCK_TODAY, categories, destinations, schools, programs, reviews, passports, visaRules, visaLastChecked: VISA_LAST_CHECKED }, null, 1) + "\n",
);
console.log(`Wrote ${out}`);
