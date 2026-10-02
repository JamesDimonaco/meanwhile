import { LOCALES, type Locale } from "@/i18n/locales";
import { isListableCountry } from "./countries";
import { defaultPeriod } from "./queries";
import type { Culture, Period } from "./schema";
import type { War } from "./war-schema";
import { isShownIn, warCountryCodes, warOuter, warsShownIn } from "./wars";

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
 * a year. Fuzzy edges alone don't count. Two civilisations must share more
 * than one year, since the data writes a handover as one ending the year the
 * next starts (Sui and Tang, 618); a war counts even in a civilisation's last
 * year, because that is where the war that ended it falls.
 */
export function overlaps(a: CountryItem, b: CountryItem): boolean {
  const x = itemBounds(a);
  const y = itemBounds(b);
  const handover = a.kind === "culture" && b.kind === "culture" ? 1 : 0;
  return x.latestStart + handover <= y.earliestEnd && y.latestStart + handover <= x.earliestEnd;
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
    items.map((item) => [itemId(item), items.filter((other) => other !== item && overlaps(item, other))]),
  );
}

/** The newest share of a country's items its chart can open on. */
const OPEN_SHARE = 3 / 4;
/** Opening on that share must zoom in at least this much; for less, hiding the oldest items isn't worth it. */
const MIN_OPEN_ZOOM = 4;

const extent = (bounds: readonly Bounds[]): [number, number] => [
  Math.min(...bounds.map((b) => b.earliestStart)),
  Math.max(...bounds.map((b) => b.latestEnd)),
];

/**
 * Where a country's chart opens (items oldest first, as countryItems gives
 * them). The range is the newest three-quarters of the items when one early
 * civilisation would otherwise squeeze everything else into a strip (Neolithic
 * Britain and 21 wars), else everything. The year is the start of the item
 * that overlaps the most others running in that year, the latest on a tie, so
 * the year panel opens on things happening at once.
 */
export function openingView(items: readonly CountryItem[]): { range: [number, number]; year: number } {
  const bounds = items.map(itemBounds);
  const all = extent(bounds);
  const newest = extent(bounds.slice(Math.floor(bounds.length * (1 - OPEN_SHARE))));
  const range = all[1] - all[0] >= MIN_OPEN_ZOOM * (newest[1] - newest[0]) ? newest : all;
  let best = { year: range[0], count: 0 };
  for (const item of items) {
    const year = itemBounds(item).latestStart;
    if (year < range[0] || year > range[1]) continue;
    const running = items.filter((other) => {
      const b = itemBounds(other);
      return other === item || (overlaps(item, other) && b.latestStart <= year && year <= b.earliestEnd);
    });
    if (running.length >= best.count) best = { year, count: running.length };
  }
  return { range, year: best.year };
}

/**
 * Pages that exist in some languages only (the review gate), mapped to the
 * languages they exist in, so the language switcher never links to a 404.
 * Pass every war, gate not applied.
 */
export function localeGaps(wars: readonly War[], heartland: Heartland): Record<string, Locale[]> {
  const gaps: Record<string, Locale[]> = {};
  const record = (path: string, shown: (l: Locale) => boolean) => {
    const locales = LOCALES.filter(shown);
    if (locales.length < LOCALES.length) gaps[path] = locales;
  };
  for (const war of wars) record(`/war/${war.id}`, (l) => isShownIn(war, l));
  const pages = Object.fromEntries(LOCALES.map((l) => [l, countryCodes(heartland, warsShownIn(wars, l))]));
  for (const code of countryCodes(heartland, wars)) {
    record(`/country/${code.toLowerCase()}`, (l) => pages[l].includes(code));
  }
  return gaps;
}

/** The gaps a page in this language needs: a path hidden in it has no page there to switch from, and naming it would leak the war. */
export function gapsOnPagesIn(gaps: Record<string, Locale[]>, locale: Locale): Record<string, Locale[]> {
  return Object.fromEntries(Object.entries(gaps).filter(([, locales]) => locales.includes(locale)));
}
