// Row layout shared by the frozen name column and the scrollable SVG, so the
// two stay pixel-aligned without any DOM measuring.

import type { Locale } from "@/i18n/locales";
import { itemBounds, type CountryItem } from "@/lib/data/country";
import { localize } from "@/lib/data/localize";
import { defaultPeriod } from "@/lib/data/queries";
import { REGIONS } from "@/lib/data/regions";
import type { Culture, EventType, Period, Region } from "@/lib/data/schema";

/**
 * What the timeline draws, and nothing else: sources, notes, periodoId,
 * descriptions and facts stay on the server, and text is localized to a
 * plain string server-side rather than shipping all three languages.
 */
export type TimelinePeriod = Pick<Period, "earliestStart" | "latestStart" | "earliestEnd" | "latestEnd" | "disputed">;
export type TimelineEvent = { id: string; start: number; type: EventType; title: string; disputed: boolean };
export type TimelineCulture = {
  id: string;
  region: Region;
  name: string;
  period: TimelinePeriod;
  phases: { id: string; start: number; end: number }[];
  events: TimelineEvent[];
};

export function toTimelineCulture(culture: Culture, locale: Locale): TimelineCulture {
  const { earliestStart, latestStart, earliestEnd, latestEnd, disputed } = defaultPeriod(culture);
  return {
    id: culture.id,
    region: culture.region,
    name: localize(culture.name, locale),
    period: { earliestStart, latestStart, earliestEnd, latestEnd, disputed },
    phases: culture.phases.map(({ id, start, end }) => ({ id, start, end })),
    events: culture.events.map(({ id, start, type, title, disputed }) => ({
      id,
      start,
      type,
      title: localize(title, locale),
      disputed,
    })),
  };
}

/** A bar on a country's timeline: a civilisation or a war, drawn without event markers. */
export type TimelineBar = {
  kind: "culture" | "war";
  id: string;
  name: string;
  /** A civilisation's region colour; a war is drawn in --war. */
  region: Region | null;
  period: TimelinePeriod;
  phases: { id: string; start: number; end: number }[];
  /** An ongoing war's asOf date, for "ongoing, as of"; null for everything else. */
  asOf: string | null;
};

export function toTimelineBar(item: CountryItem, locale: Locale): TimelineBar {
  const { earliestStart, latestStart, earliestEnd, latestEnd } = itemBounds(item);
  const bounds = { earliestStart, latestStart, earliestEnd, latestEnd };
  const phases = (item.kind === "culture" ? item.culture.phases : item.war.phases).map(({ id, start, end }) => ({ id, start, end }));
  if (item.kind === "culture") {
    const { culture } = item;
    const { disputed } = defaultPeriod(culture);
    return { kind: "culture", id: culture.id, name: localize(culture.name, locale), region: culture.region, period: { ...bounds, disputed }, phases, asOf: null };
  }
  const { war } = item;
  const disputed = war.period?.disputed ?? war.ongoing?.disputed ?? false;
  return { kind: "war", id: war.id, name: localize(war.name, locale), region: null, period: { ...bounds, disputed }, phases, asOf: war.ongoing?.asOf ?? null };
}

export const HEADER_ROW_HEIGHT = 24;
export const CULTURE_ROW_HEIGHT = 22;
/** A fingertip tall: a country's row names are links, and a tap on a bar moves the year line into it. */
export const BAR_ROW_HEIGHT = 32;

export type TimelineRow<T, G> =
  | { kind: "header"; group: G; y: number; height: number }
  | { kind: "item"; item: T; y: number; height: number };

/** A header row per non-empty group, then one row per item, top to bottom with no gaps. */
function stackRows<T, G>(groups: readonly { group: G; items: readonly T[] }[], rowHeight: number) {
  const rows: TimelineRow<T, G>[] = [];
  let y = 0;
  for (const { group, items } of groups) {
    if (items.length === 0) continue;
    rows.push({ kind: "header", group, y, height: HEADER_ROW_HEIGHT });
    y += HEADER_ROW_HEIGHT;
    for (const item of items) {
      rows.push({ kind: "item", item, y, height: rowHeight });
      y += rowHeight;
    }
  }
  return { rows, totalHeight: y };
}

/** One row per region header plus one per culture, region order fixed by REGIONS. */
export function layoutRows(cultures: readonly TimelineCulture[]) {
  const groups = REGIONS.map((region) => ({
    group: region,
    items: cultures
      .filter((c) => c.region === region)
      .sort((a, b) => a.period.earliestStart - b.period.earliestStart || a.id.localeCompare(b.id)),
  }));
  return stackRows(groups, CULTURE_ROW_HEIGHT);
}

export type CountryGroup = "cultures" | "wars";

/** Civilisations, then wars, each in the order given (the page's date order). */
export function layoutCountryRows(bars: readonly TimelineBar[]) {
  return stackRows<TimelineBar, CountryGroup>(
    [
      { group: "cultures", items: bars.filter((b) => b.kind === "culture") },
      { group: "wars", items: bars.filter((b) => b.kind === "war") },
    ],
    BAR_ROW_HEIGHT,
  );
}
