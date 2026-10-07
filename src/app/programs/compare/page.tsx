import type { Metadata } from "next";
import { CompareView } from "@/components/programs/CompareView";

export const metadata: Metadata = { title: "Compare programs" };

export default function ComparePage() {
  return <CompareView />;
}
