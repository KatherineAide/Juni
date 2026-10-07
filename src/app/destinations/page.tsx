import type { Metadata } from "next";
import { DestinationsGrid } from "@/components/destinations/DestinationsGrid";

export const metadata: Metadata = { title: "Destinations" };

export default function DestinationsPage() {
  return <DestinationsGrid />;
}
