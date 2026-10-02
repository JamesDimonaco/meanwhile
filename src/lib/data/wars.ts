import { LOCALES, type Locale } from "@/i18n/locales";
import { UN_MEMBERS, type Continent } from "./countries";
import type { Casualty, War, WarFile } from "./war-schema";

type Dated = Pick<WarFile, "period" | "ongoing">;

/** Every year the war could span: [earliestStart, latestEnd], an ongoing war running to its asOf year. */
export function warOuter(war: Dated): [number, number] {
  if (war.period) return [war.period.earliestStart, war.period.latestEnd];
  if (war.ongoing) return [war.ongoing.earliestStart, Number(war.ongoing.asOf.slice(0, 4))];
  throw new Error("a war needs a period or ongoing");
}

/** The dates a row shows: the likely start, and the likely end, or null and the asOf date while it goes on. */
export type WarSpan = { start: number; end: number | null; asOf: string | null };

export function warSpan(war: Dated): WarSpan {
  if (war.period) return { start: war.period.latestStart, end: war.period.earliestEnd, asOf: null };
  if (war.ongoing) return { start: war.ongoing.latestStart, end: null, asOf: war.ongoing.asOf };
  throw new Error("a war needs a period or ongoing");
}

/** Every country code the wars list, sorted: each needs a flag in public/flags. */
export function warCountryCodes(wars: readonly Pick<War, "sides">[]): string[] {
  const codes = new Set<string>();
  for (const war of wars) {
    for (const side of war.sides) {
      for (const m of side.members) {
        for (const code of m.today) codes.add(code);
        if (m.kind === "state") codes.add(m.code);
      }
    }
  }
  return [...codes].sort();
}

/**
 * The review gate. A sensitive war whose text in a language nobody has
 * reviewed yet doesn't exist in that language: no page, no row, no link,
 * no search hit, no sitemap entry. English always shows.
 */
export function isShownIn(war: Pick<War, "sensitive" | "reviewed">, locale: Locale): boolean {
  return locale === "en" || !war.sensitive || war.reviewed[locale];
}

export function warsShownIn<W extends Pick<War, "sensitive" | "reviewed">>(wars: readonly W[], locale: Locale): W[] {
  return wars.filter((w) => isShownIn(w, locale));
}

const oldestFirst = (a: War, b: War) => warSpan(a).start - warSpan(b).start || a.id.localeCompare(b.id);

/** The wars a country's page lists, oldest first. */
export function warsForCountry(wars: readonly War[], code: string): War[] {
  return wars.filter((w) => warCountryCodes([w]).includes(code)).sort(oldestFirst);
}

/** The wars a culture's page lists: those naming it in cultures[], oldest first. */
export function warsForCulture(wars: readonly War[], cultureId: string): War[] {
  return wars.filter((w) => w.cultures.includes(cultureId)).sort(oldestFirst);
}

/** `terms`: the code and the name in every language, so a search in any of them finds the country. */
export type CountryEntry = { code: string; name: string; terms: string[]; continent: Continent; count: number };

/** A present-day country's name in the page's language, from its ISO code. */
export function countryName(code: string, locale: Locale): string {
  return new Intl.DisplayNames([locale], { type: "region" }).of(code) ?? code;
}

/** Every country some war lists, named in the page's language and sorted by that name. */
export function countryIndex(wars: readonly War[], locale: Locale): CountryEntry[] {
  return warCountryCodes(wars)
    .map((code) => ({
      code,
      name: countryName(code, locale),
      terms: [code, ...LOCALES.map((l) => countryName(code, l))],
      continent: UN_MEMBERS[code],
      count: wars.filter((w) => warCountryCodes([w]).includes(code)).length,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, locale));
}

/**
 * Pages that exist in some languages only (the review gate), mapped to the
 * languages they exist in, so the language switcher never links to a 404.
 */
export function localeGaps(wars: readonly War[]): Record<string, Locale[]> {
  const gaps: Record<string, Locale[]> = {};
  const record = (path: string, shown: (l: Locale) => boolean) => {
    const locales = LOCALES.filter(shown);
    if (locales.length < LOCALES.length) gaps[path] = locales;
  };
  for (const war of wars) record(`/war/${war.id}`, (l) => isShownIn(war, l));
  for (const code of warCountryCodes(wars)) {
    record(`/wars/${code.toLowerCase()}`, (l) => warsForCountry(warsShownIn(wars, l), code).length > 0);
  }
  return gaps;
}

/** The gaps a page in this language needs: a path hidden in it has no page there to switch from, and naming it would leak the war. */
export function gapsOnPagesIn(gaps: Record<string, Locale[]>, locale: Locale): Record<string, Locale[]> {
  return Object.fromEntries(Object.entries(gaps).filter(([, locales]) => locales.includes(locale)));
}

/**
 * Death tolls grouped by what they count and for whom, so one party's official
 * figure sits beside the independent estimates of the same thing.
 */
export function casualtyGroups(casualties: readonly Casualty[]): Casualty[][] {
  const groups = new Map<string, Casualty[]>();
  for (const c of casualties) {
    const key = `${c.scope}|${c.side ?? ""}|${c.who?.en ?? ""}`;
    groups.set(key, [...(groups.get(key) ?? []), c]);
  }
  return [...groups.values()];
}
