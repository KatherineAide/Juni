"use client";

import { getDestination } from "@/data/destinations";
import { getProgram } from "@/data/programs";
import { useT } from "@/i18n";
import { useAppState } from "@/lib/store";
import { DestinationCard } from "../destinations/DestinationsGrid";
import { ProgramCard } from "../programs/ProgramCard";
import { EmptyState, PageHeader, SectionTitle } from "../ui/misc";

export function SavedView() {
  const { t } = useT();
  const programIds = useAppState((s) => s.savedPrograms);
  const destIds = useAppState((s) => s.savedDestinations);
  const programs = programIds.map(getProgram).filter((p) => !!p);
  const dests = destIds.map(getDestination).filter((d) => !!d);
  return (
    <>
      <PageHeader title={t("saved.title")} subtitle={t("saved.subtitle")} />
      {!programs.length && !dests.length && <EmptyState>{t("saved.empty")}</EmptyState>}
      {programs.length > 0 && (
        <section aria-labelledby="saved-programs" className="mb-10">
          <SectionTitle id="saved-programs">{t("saved.programs")}</SectionTitle>
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {programs.map((p) => (
              <li key={p.id}>
                <ProgramCard program={p} />
              </li>
            ))}
          </ul>
        </section>
      )}
      {dests.length > 0 && (
        <section aria-labelledby="saved-dests">
          <SectionTitle id="saved-dests">{t("saved.destinations")}</SectionTitle>
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {dests.map((d) => (
              <li key={d.id}>
                <DestinationCard d={d} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
