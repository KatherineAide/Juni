"use client";

import { MapPin } from "lucide-react";
import { useT } from "@/i18n";
import type { Destination, School } from "@/lib/types";

/**
 * Schematic, offline-friendly map: schools are plotted by their coordinates
 * relative to the city centre. Phase 2 can swap in an interactive tile map.
 */
export function SchoolMap({ destination, schools }: { destination: Destination; schools: School[] }) {
  const { t } = useT();
  const located = schools.filter((s) => s.coords);
  const unlocated = schools.filter((s) => !s.coords);
  const span =
    Math.max(
      0.01,
      ...located.map((s) => Math.max(Math.abs(s.coords!.lat - destination.center.lat), Math.abs(s.coords!.lng - destination.center.lng))),
    ) * 1.35;
  const pos = (s: School) => ({
    left: `${50 + ((s.coords!.lng - destination.center.lng) / span) * 45}%`,
    top: `${50 - ((s.coords!.lat - destination.center.lat) / span) * 45}%`,
  });
  const colour = (s: School) => (s.verification.status === "verified" ? "text-lagoon-600" : s.verification.status === "risk" ? "text-fit-none" : "text-slate-500");

  return (
    <div>
      <div
        className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-line bg-[#eef3ea]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(31,26,23,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(31,26,23,0.05) 1px, transparent 1px), radial-gradient(circle at 30% 70%, #dfe9f2 0 18%, transparent 19%)",
          backgroundSize: "32px 32px, 32px 32px, 100% 100%",
        }}
        role="img"
        aria-label={`${t("dest.map")}: ${located.map((s) => s.name).join(", ")}`}
      >
        <span className="absolute left-1/2 top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-ink" aria-hidden />
        <span className="absolute left-1/2 top-1/2 mt-2 -translate-x-1/2 text-[11px] font-bold text-ink/70" aria-hidden>
          {destination.name}
        </span>
        {located.map((s, i) => (
          <span key={s.id} className="absolute -translate-x-1/2 -translate-y-full" style={pos(s)} aria-hidden>
            <span className="relative flex flex-col items-center">
              <span className="mb-0.5 rounded-md bg-white px-1.5 py-0.5 text-[11px] font-bold shadow">{i + 1}</span>
              <MapPin className={`size-7 fill-white ${colour(s)}`} />
            </span>
          </span>
        ))}
      </div>
      <ol className="mt-3 space-y-1.5 text-sm">
        {located.map((s, i) => (
          <li key={s.id} className="flex flex-wrap items-baseline gap-x-2">
            <span className="font-bold">{i + 1}.</span>
            <span className="font-semibold">{s.name}</span>
            <span className="text-muted">{s.address}</span>
            <a
              className="text-xs font-semibold text-lagoon-700 underline"
              href={`https://www.openstreetmap.org/?mlat=${s.coords!.lat}&mlon=${s.coords!.lng}#map=17/${s.coords!.lat}/${s.coords!.lng}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t("dest.openMap")}
            </a>
          </li>
        ))}
        {unlocated.map((s) => (
          <li key={s.id} className="flex flex-wrap items-baseline gap-x-2 text-fit-none">
            <span className="font-bold">!</span>
            <span className="font-semibold">{s.name}</span>
            <span>{t("dest.noAddress")}</span>
          </li>
        ))}
      </ol>
      <p className="mt-2 text-xs text-muted">{t("dest.mapNote")}</p>
    </div>
  );
}
