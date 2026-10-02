import { isListableCountry } from "./countries";
import { defaultPeriod } from "./queries";
import type { Culture, Period } from "./schema";
import type { War } from "./war-schema";
import { warCountryCodes, warOuter } from "./wars";

/** data/today.json: culture id -> the present-day countries its heartland lies in. */
export type Heartland = Readonly<Record<string, readonly string[]>>;

/**
 * The countries with a page in a language: every heartland country and every
 * country a war shown in that language lists (pass loadWars(locale), so a
 * gated war adds none). UN members only, never a NEVER_SHOWN code.
 */
export function countryCodes(heartland: Heartland, shownWars: readonly War[]): string[] {
  const codes = new Set([...Object.values(heartland).flat(), ...warCountryCodes(shownWars)]);
  return [...codes].filter(isListableCountry).sort();
}

/** A civilisation or a war on a country's page. Culture and war ids never clash (validation). */
export type CountryItem = { kind: "culture"; culture: Culture } | { kind: "war"; war: War };

type Bounds = Pick<Period, "earliestStart" | "latestStart" | "earliestEnd" | "latestEnd">;

export const itemId = (item: CountryItem) => (item.kind === "culture" ? item.culture.id : item.war.id);

/** A culture's default period; a war's period, or an ongoing war's dates running solid to its asOf year. */
export function itemBounds(item: CountryItem): Bounds {
  if (item.kind === "culture") return defaultPeriod(item.culture);
  const { war } = item;
  if (war.period) return war.period;
  if (!war.ongoing) throw new Error("a war needs a period or ongoing");
  const end = warOuter(war)[1];
  return { earliestStart: war.ongoing.earliestStart, latestStart: war.ongoing.latestStart, earliestEnd: end, latestEnd: end };
}

/**
 * Two items overlap when their solid spans (latestStart..earliestEnd) share
 * at least one year. Fuzzy edges alone don't count, or every dynasty would
 * overlap the one it replaced.
 */
export function overlaps(a: Bounds, b: Bounds): boolean {
  return a.latestStart <= b.earliestEnd && b.latestStart <= a.earliestEnd;
}

/** A country's civilisations (by heartland) and the wars shown in its language, oldest first. */
export function countryItems(code: string, cultures: readonly Culture[], heartland: Heartland, shownWars: readonly War[]): CountryItem[] {
  const items: CountryItem[] = [
    ...cultures.filter((c) => heartland[c.id]?.includes(code)).map((culture) => ({ kind: "culture" as const, culture })),
    ...shownWars.filter((w) => warCountryCodes([w]).includes(code)).map((war) => ({ kind: "war" as const, war })),
  ];
  return items.sort((a, b) => itemBounds(a).latestStart - itemBounds(b).latestStart || itemId(a).localeCompare(itemId(b)));
}

/** Each item's id -> the other items it overlapped with, in the list's order. */
export function overlapping(items: readonly CountryItem[]): Map<string, CountryItem[]> {
  return new Map(
    items.map((item) => [itemId(item), items.filter((other) => other !== item && overlaps(itemBounds(item), itemBounds(other)))]),
  );
}
