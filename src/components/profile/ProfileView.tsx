"use client";

import { Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { categories } from "@/data/categories";
import { passports } from "@/data/visa";
import { useT } from "@/i18n";
import { money } from "@/lib/format";
import { actions, useAppState } from "@/lib/store";
import type { AccessibilityTag, CategoryId, HousingType, Lang, PassportCode, Profile } from "@/lib/types";
import { PageHeader } from "../ui/misc";

const housingTypes: HousingType[] = ["homestay", "residence", "apartment", "hostel"];
const accessTags: AccessibilityTag[] = ["step-free", "accessible-housing", "hearing-support", "low-vision", "flexible-pace"];

function toggle<T>(list: T[], v: T): T[] {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

function ToggleChip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick} className={`chip ${on ? "!border-lagoon-600 !bg-lagoon-50 !text-lagoon-700" : ""}`}>
      {on && <span aria-hidden>✓</span>}
      {children}
    </button>
  );
}

export function ProfileView() {
  const { t, lang } = useT();
  const profile = useAppState((s) => s.profile);
  const [skill, setSkill] = useState({ label: "", level: "" });
  const [diet, setDiet] = useState("");
  const set = (patch: Partial<Profile>) => actions.updateProfile(patch);

  const knows: { key: string; label: string; value: string; clear: () => void }[] = [
    { key: "name", label: t("profile.name"), value: profile.name, clear: () => set({ name: "" }) },
    { key: "city", label: t("profile.homeCity"), value: profile.homeCity, clear: () => set({ homeCity: "" }) },
    { key: "passport", label: t("profile.passport"), value: passports.find((p) => p.code === profile.passport)?.name[lang] ?? "", clear: () => set({ passport: "" }) },
    { key: "budget", label: t("profile.budget"), value: `${money(profile.budgetMin, lang)}–${money(profile.budgetMax, lang)}`, clear: () => set({ budgetMin: 0, budgetMax: 0 }) },
    { key: "interests", label: t("profile.interests"), value: profile.interests.map((i) => categories.find((c) => c.id === i)!.name[lang]).join(", "), clear: () => set({ interests: [] }) },
    { key: "skills", label: t("profile.skills"), value: profile.skills.map((s) => `${s.label} ${s.level}`).join(", "), clear: () => set({ skills: [] }) },
    { key: "housing", label: t("profile.housing"), value: profile.housing.map((h) => t(`common.housing.${h}`)).join(", "), clear: () => set({ housing: [] }) },
    { key: "access", label: t("profile.accessibility"), value: profile.accessibility.map((a) => t(`common.access.${a}`)).join(", "), clear: () => set({ accessibility: [] }) },
    { key: "diet", label: t("profile.dietary"), value: profile.dietary.join(", "), clear: () => set({ dietary: [] }) },
  ];

  return (
    <>
      <PageHeader title={t("profile.title")} subtitle={t("profile.subtitle")} />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <form className="card space-y-6 p-5 sm:p-6" onSubmit={(e) => e.preventDefault()} aria-label={t("profile.title")}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="label">{t("profile.name")}</span>
              <input className="input" value={profile.name} onChange={(e) => set({ name: e.target.value })} autoComplete="given-name" />
            </label>
            <label className="block">
              <span className="label">{t("profile.language")}</span>
              <select className="input" value={profile.lang} onChange={(e) => actions.setLang(e.target.value as Lang)}>
                <option value="en">English</option>
                <option value="es">Español</option>
              </select>
            </label>
            <label className="block">
              <span className="label">{t("profile.homeCity")}</span>
              <input className="input" value={profile.homeCity} onChange={(e) => set({ homeCity: e.target.value })} autoComplete="address-level2" />
            </label>
            <label className="block">
              <span className="label">{t("profile.passport")}</span>
              <select className="input" value={profile.passport} onChange={(e) => set({ passport: e.target.value as PassportCode | "" })} aria-describedby="passport-note">
                <option value="">{t("profile.notSet")}</option>
                {passports.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.name[lang]}
                  </option>
                ))}
              </select>
              <span id="passport-note" className="mt-1 block text-xs text-muted">
                {t("profile.passportNote")}
              </span>
            </label>
          </div>

          <fieldset>
            <legend className="label">{t("profile.budget")}</legend>
            <div className="grid grid-cols-2 gap-4">
              <label className="block text-sm">
                <span className="mb-1 block text-muted">{t("profile.budgetMin")}</span>
                <input className="input" type="number" min={0} step={100} value={profile.budgetMin} onChange={(e) => set({ budgetMin: Number(e.target.value) })} />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-muted">{t("profile.budgetMax")}</span>
                <input className="input" type="number" min={0} step={100} value={profile.budgetMax} onChange={(e) => set({ budgetMax: Number(e.target.value) })} />
              </label>
            </div>
          </fieldset>

          <fieldset>
            <legend className="label">{t("profile.interests")}</legend>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <ToggleChip key={c.id} on={profile.interests.includes(c.id)} onClick={() => set({ interests: toggle<CategoryId>(profile.interests, c.id) })}>
                  {c.name[lang]}
                </ToggleChip>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="label">{t("profile.skills")}</legend>
            <ul className="mb-2 flex flex-wrap gap-2">
              {profile.skills.map((s, i) => (
                <li key={`${s.label}-${i}`} className="inline-flex items-center gap-1 rounded-full bg-sand-100 py-1 pl-3 pr-1 text-sm font-semibold">
                  {s.label} · {s.level}
                  <button type="button" onClick={() => set({ skills: profile.skills.filter((_, j) => j !== i) })} className="grid size-6 place-items-center rounded-full hover:bg-sand-200" aria-label={`${t("common.delete")}: ${s.label}`}>
                    <X aria-hidden className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2">
              <label className="sr-only" htmlFor="skill-label">
                {t("profile.skillLabel")}
              </label>
              <input id="skill-label" className="input flex-1" placeholder={`${t("profile.skillLabel")} (Spanish)`} value={skill.label} onChange={(e) => setSkill({ ...skill, label: e.target.value })} />
              <label className="sr-only" htmlFor="skill-level">
                {t("profile.skillLevel")}
              </label>
              <input id="skill-level" className="input w-32" placeholder={`${t("profile.skillLevel")} (B1)`} value={skill.level} onChange={(e) => setSkill({ ...skill, level: e.target.value })} />
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  if (!skill.label.trim()) return;
                  set({ skills: [...profile.skills, { label: skill.label.trim(), level: skill.level.trim() || "—" }] });
                  setSkill({ label: "", level: "" });
                }}
              >
                <Plus aria-hidden className="size-4" />
                {t("profile.addSkill")}
              </button>
            </div>
          </fieldset>

          <fieldset>
            <legend className="label">{t("profile.housing")}</legend>
            <div className="flex flex-wrap gap-2">
              {housingTypes.map((h) => (
                <ToggleChip key={h} on={profile.housing.includes(h)} onClick={() => set({ housing: toggle(profile.housing, h) })}>
                  {t(`common.housing.${h}`)}
                </ToggleChip>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="label">{t("profile.accessibility")}</legend>
            <div className="flex flex-wrap gap-2">
              {accessTags.map((a) => (
                <ToggleChip key={a} on={profile.accessibility.includes(a)} onClick={() => set({ accessibility: toggle(profile.accessibility, a) })}>
                  {t(`common.access.${a}`)}
                </ToggleChip>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="label">{t("profile.dietary")}</legend>
            <ul className="mb-2 flex flex-wrap gap-2">
              {profile.dietary.map((d) => (
                <li key={d} className="inline-flex items-center gap-1 rounded-full bg-sand-100 py-1 pl-3 pr-1 text-sm font-semibold">
                  {d}
                  <button type="button" onClick={() => set({ dietary: profile.dietary.filter((x) => x !== d) })} className="grid size-6 place-items-center rounded-full hover:bg-sand-200" aria-label={`${t("common.delete")}: ${d}`}>
                    <X aria-hidden className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <label htmlFor="diet" className="sr-only">
                {t("profile.dietary")}
              </label>
              <input id="diet" className="input" placeholder={t("profile.dietaryPlaceholder")} value={diet} onChange={(e) => setDiet(e.target.value)} />
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  if (!diet.trim()) return;
                  set({ dietary: [...new Set([...profile.dietary, diet.trim()])] });
                  setDiet("");
                }}
              >
                <Plus aria-hidden className="size-4" />
                {t("common.add")}
              </button>
            </div>
          </fieldset>
          <p className="text-xs text-muted" aria-live="polite">
            ✓ {t("profile.saved")}
          </p>
        </form>

        <aside className="space-y-4">
          <section aria-labelledby="knows" className="card p-5">
            <h2 id="knows" className="font-bold">
              {t("profile.knows")}
            </h2>
            <p className="mt-1 text-sm text-muted">{t("profile.knowsNote")}</p>
            <dl className="mt-3 divide-y divide-line text-sm">
              {knows.map((k) => (
                <div key={k.key} className="flex items-start gap-2 py-2">
                  <div className="flex-1">
                    <dt className="text-xs font-bold uppercase tracking-wide text-muted">{k.label}</dt>
                    <dd className={k.value ? "" : "italic text-muted"}>{k.value || t("profile.notSet")}</dd>
                  </div>
                  {k.value && (
                    <button type="button" onClick={k.clear} className="grid size-8 place-items-center rounded-full text-muted hover:bg-sand-100 hover:text-fit-none" aria-label={`${t("common.delete")}: ${k.label}`}>
                      <Trash2 aria-hidden className="size-4" />
                    </button>
                  )}
                </div>
              ))}
            </dl>
          </section>
          <button
            type="button"
            className="btn btn-ghost w-full text-muted"
            onClick={() => {
              if (confirm(t("profile.resetConfirm"))) actions.resetDemo();
            }}
          >
            {t("profile.reset")}
          </button>
        </aside>
      </div>
    </>
  );
}
