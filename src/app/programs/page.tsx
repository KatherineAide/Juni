import type { Metadata } from "next";
import { Suspense } from "react";
import { CategoryTiles, ProgramsBrowser } from "@/components/programs/ProgramsBrowser";
import { TPageHeader } from "@/components/ui/misc";

export const metadata: Metadata = { title: "Programs" };

export default function ProgramsPage() {
  return (
    <>
      <TPageHeader title="prog.title" subtitle="prog.subtitle" />
      <CategoryTiles />
      <Suspense fallback={<div className="card h-96 animate-pulse" />}>
        <ProgramsBrowser />
      </Suspense>
    </>
  );
}
