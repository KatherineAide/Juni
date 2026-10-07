import type { Metadata } from "next";
import { EvalDashboard } from "@/components/evals/EvalDashboard";

export const metadata: Metadata = { title: "Evaluation" };

export default function EvalsPage() {
  return <EvalDashboard />;
}
