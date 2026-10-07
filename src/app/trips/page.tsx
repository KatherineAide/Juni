import type { Metadata } from "next";
import { Suspense } from "react";
import { TripsView } from "@/components/trips/TripsView";

export const metadata: Metadata = { title: "My Trips" };

export default function TripsPage() {
  return (
    <Suspense fallback={<div className="card h-96 animate-pulse" />}>
      <TripsView />
    </Suspense>
  );
}
