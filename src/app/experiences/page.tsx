import type { Metadata } from "next";
import { ExperiencesView } from "@/components/experiences/ExperiencesView";

export const metadata: Metadata = { title: "My Experiences" };

export default function ExperiencesPage() {
  return <ExperiencesView />;
}
