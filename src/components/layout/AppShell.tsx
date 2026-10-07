"use client";

import { Bell, Compass, GraduationCap, Heart, Luggage, MessageCircleHeart, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { useT, type MessageKey } from "@/i18n";
import { actions, useAppState } from "@/lib/store";
import { CompareTray } from "./CompareTray";

const mainNav: { href: string; key: MessageKey; short?: MessageKey; Icon: typeof Compass }[] = [
  { href: "/chat", key: "nav.chat", Icon: MessageCircleHeart },
  { href: "/destinations", key: "nav.destinations", Icon: Compass },
  { href: "/programs", key: "nav.programs", Icon: GraduationCap },
  { href: "/trips", key: "nav.trips", Icon: Luggage },
  { href: "/experiences", key: "nav.experiencesLong", short: "nav.experiences", Icon: Sparkles },
  { href: "/profile", key: "nav.profile", Icon: UserRound },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/chat" className={`inline-flex items-center gap-2 ${className}`} aria-label="Juni">
      <svg viewBox="0 0 32 32" aria-hidden className="size-8">
        <circle cx="16" cy="16" r="15" fill="var(--color-clay-500)" />
        <path d="M5 20c4-3 7-3 11 0s7 3 11 0" stroke="#fff" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        <circle cx="16" cy="12" r="4.2" fill="#f7d38a" />
      </svg>
      <span className="h-display text-2xl font-bold tracking-tight text-ink">juni</span>
    </Link>
  );
}

function LangSwitch({ compact = false }: { compact?: boolean }) {
  const { t, lang } = useT();
  return (
    <div role="group" aria-label={t("lang.label")} className="inline-flex rounded-full border border-line bg-white p-0.5 text-xs font-bold">
      {(["en", "es"] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => actions.setLang(l)}
          aria-pressed={lang === l}
          lang={l}
          aria-label={l === "en" ? "English" : "Español"}
          className={`rounded-full px-2.5 py-1 uppercase ${lang === l ? "bg-ink text-white" : "text-muted hover:text-ink"} ${compact ? "" : "min-w-10"}`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { t, lang } = useT();
  const unread = useAppState((s) => s.notifications.filter((n) => !n.read).length);
  const savedCount = useAppState((s) => s.savedPrograms.length + s.savedDestinations.length);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const secondary = [
    { href: "/saved", label: t("nav.saved"), Icon: Heart, count: savedCount },
    { href: "/notifications", label: t("nav.notifications"), Icon: Bell, count: unread },
    { href: "/trust", label: t("nav.trust"), Icon: ShieldCheck, count: 0 },
  ];

  return (
    <div className="min-h-dvh lg:pl-64">
      <a href="#main" className="sr-only z-50 rounded-full bg-ink px-4 py-2 text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        {t("nav.skip")}
      </a>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-white px-4 py-6 lg:flex">
        <Logo className="px-2" />
        <p className="mt-1 px-2 text-xs text-muted">{t("brand.tagline")}</p>
        <nav aria-label={t("nav.main")} className="mt-8 flex flex-col gap-1">
          {mainNav.map(({ href, key, Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-semibold transition-colors ${active ? "bg-clay-50 text-clay-700" : "text-ink hover:bg-sand-100"}`}
              >
                <Icon aria-hidden className="size-5" />
                {t(key)}
              </Link>
            );
          })}
        </nav>
        <hr className="my-5 border-line" />
        <nav aria-label={t("nav.trust")} className="flex flex-col gap-1">
          {secondary.map(({ href, label, Icon, count }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium ${active ? "bg-clay-50 text-clay-700" : "text-muted hover:bg-sand-100 hover:text-ink"}`}
              >
                <Icon aria-hidden className="size-[18px]" />
                <span className="flex-1">{label}</span>
                {count > 0 && <span className="rounded-full bg-clay-600 px-2 text-xs font-bold text-white">{count}</span>}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto flex items-center justify-between px-2">
          <span className="text-xs font-semibold text-muted">{t("lang.label")}</span>
          <LangSwitch />
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-white/95 px-4 py-2.5 backdrop-blur lg:hidden">
        <Logo />
        <div className="flex items-center gap-1">
          {secondary.map(({ href, label, Icon, count }) => (
            <Link key={href} href={href} aria-label={label} className="relative grid size-10 place-items-center rounded-full text-ink hover:bg-sand-100">
              <Icon aria-hidden className="size-5" />
              {count > 0 && href === "/notifications" && (
                <span className="absolute right-1.5 top-1.5 grid min-w-4 place-items-center rounded-full bg-clay-600 px-1 text-[10px] font-bold text-white">{count}</span>
              )}
            </Link>
          ))}
          <LangSwitch compact />
        </div>
      </header>

      <div className="border-b border-line bg-sand-100 px-4 py-1.5 text-center text-xs font-medium text-muted">{t("mock.banner")}</div>

      <main id="main" className="mx-auto w-full max-w-6xl px-4 pb-32 pt-6 sm:px-6 lg:px-10 lg:pb-16 lg:pt-10">
        {children}
      </main>

      <CompareTray />

      {/* Mobile bottom tab bar */}
      <nav aria-label={t("nav.main")} className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white pb-[env(safe-area-inset-bottom)] lg:hidden">
        <ul className="grid grid-cols-6">
          {mainNav.map(({ href, key, short, Icon }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`flex flex-col items-center gap-0.5 px-0.5 py-2 text-[10px] font-semibold leading-tight tracking-tight ${active ? "text-clay-700" : "text-muted"}`}
                >
                  <span className={`grid h-7 w-12 place-items-center rounded-full ${active ? "bg-clay-50" : ""}`}>
                    <Icon aria-hidden className="size-5" />
                  </span>
                  <span className="max-w-full">{t(short ?? key)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
