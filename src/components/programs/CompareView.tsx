"use client";

import Link from "next/link";
import { useT } from "@/i18n";
import { actions, useAppState } from "@/lib/store";
import { EmptyState, PageHeader } from "../ui/misc";
import { CompareTable } from "./CompareTable";

export function CompareView() {
  const { t } = useT();
  const compare = useAppState((s) => s.compare);
  return (
    <>
      <PageHeader title={t("prog.compareTitle")} subtitle={t("prog.rankingNote")}>
        {compare.length > 0 && (
          <button type="button" className="btn btn-secondary" onClick={actions.clearCompare}>
            {t("prog.clear")}
          </button>
        )}
      </PageHeader>
      {compare.length ? (
        <CompareTable ids={compare} onRemove={(id) => actions.toggleCompare(id)} />
      ) : (
        <EmptyState
          action={
            <Link href="/programs" className="btn btn-primary">
              {t("nav.programs")}
            </Link>
          }
        >
          {t("prog.compareEmpty")}
        </EmptyState>
      )}
    </>
  );
}
