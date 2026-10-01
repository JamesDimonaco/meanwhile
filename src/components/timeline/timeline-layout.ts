// Row layout shared by the frozen name column and the scrollable SVG, so the
// two stay pixel-aligned without any DOM measuring.

import type { Locale } from "@/i18n/locales";
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

export const HEADER_ROW_HEIGHT = 24;
export const CULTURE_ROW_HEIGHT = 22;

export type TimelineRow =
  | { kind: "region"; region: Region; y: number; height: number }
  | { kind: "culture"; culture: TimelineCulture; y: number; height: number };

/** One row per region header plus one per culture, top to bottom, region order fixed by REGIONS. */
export function layoutRows(cultures: readonly TimelineCulture[]): { rows: TimelineRow[]; totalHeight: number } {
  const rows: TimelineRow[] = [];
  let y = 0;
  for (const region of REGIONS) {
    const inRegion = cultures
      .filter((c) => c.region === region)
      .sort((a, b) => a.period.earliestStart - b.period.earliestStart || a.id.localeCompare(b.id));
    if (inRegion.length === 0) continue;
    rows.push({ kind: "region", region, y, height: HEADER_ROW_HEIGHT });
    y += HEADER_ROW_HEIGHT;
    for (const culture of inRegion) {
      rows.push({ kind: "culture", culture, y, height: CULTURE_ROW_HEIGHT });
      y += CULTURE_ROW_HEIGHT;
    }
  }
  return { rows, totalHeight: y };
}
