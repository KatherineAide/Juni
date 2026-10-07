"use client";

import { BadgePercent, CalendarClock, Sparkles } from "lucide-react";
import Link from "next/link";
import { useT } from "@/i18n";
import { date } from "@/lib/format";
import { actions, useAppState } from "@/lib/store";
import type { NotificationKind } from "@/lib/types";
import { EmptyState, PageHeader } from "../ui/misc";

const icons: Record<NotificationKind, { Icon: typeof Sparkles; cls: string }> = {
  deadline: { Icon: CalendarClock, cls: "bg-clay-50 text-clay-700" },
  price: { Icon: BadgePercent, cls: "bg-lagoon-50 text-lagoon-700" },
  match: { Icon: Sparkles, cls: "bg-fit-partial-bg text-fit-partial" },
};

export function NotificationsView() {
  const { t, lang } = useT();
  const items = useAppState((s) => s.notifications);
  const unread = items.filter((n) => !n.read).length;
  return (
    <>
      <PageHeader title={t("notif.title")} subtitle={t("notif.subtitle")}>
        {unread > 0 && (
          <button type="button" className="btn btn-secondary" onClick={actions.markAllNotificationsRead}>
            {t("notif.markAll")}
          </button>
        )}
      </PageHeader>
      {unread > 0 && <p className="mb-3 text-sm font-semibold text-clay-700">{t("notif.unread", { n: unread })}</p>}
      {items.length === 0 ? (
        <EmptyState>{t("notif.empty")}</EmptyState>
      ) : (
        <ul className="space-y-3">
          {items.map((n) => {
            const { Icon, cls } = icons[n.kind];
            return (
              <li key={n.id}>
                <Link
                  href={n.href}
                  onClick={() => actions.markNotification(n.id)}
                  className={`card flex items-start gap-4 p-4 transition hover:border-clay-500 ${n.read ? "" : "border-l-4 border-l-clay-500"}`}
                >
                  <span className={`grid size-10 shrink-0 place-items-center rounded-full ${cls}`}>
                    <Icon aria-hidden className="size-5" />
                  </span>
                  <span className="flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wide text-muted">{t(`notif.kind.${n.kind}`)}</span>
                      {!n.read && <span className="size-2 rounded-full bg-clay-600" aria-label="unread" />}
                      <span className="ml-auto text-xs text-muted">{date(n.date, lang)}</span>
                    </span>
                    <span className="mt-0.5 block font-bold">{n.title[lang]}</span>
                    <span className="block text-sm text-muted">{n.body[lang]}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
