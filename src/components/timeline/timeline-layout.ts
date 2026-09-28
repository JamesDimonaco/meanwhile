// Row layout shared by the frozen name column and the scrollable SVG, so the
// two stay pixel-aligned without any DOM measuring.

import { defaultPeriod } from "@/lib/data/queries";
import { REGIONS, type Culture, type CultureEvent, type Phase, type Region } from "@/lib/data/schema";

/**
 * What the timeline draws, and nothing else: the whole dataset rides in the
 * page payload, so sources, notes, descriptions and facts stay on the server.
 */
export type TimelineEvent = Pick<CultureEvent, "id" | "start" | "type" | "title" | "disputed">;
export type TimelineCulture = Pick<Culture, "id" | "region" | "name" | "nativeName" | "periods"> & {
  phases: Pick<Phase, "id" | "start" | "end">[];
  events: TimelineEvent[];
};

export function toTimelineCulture(culture: Culture): TimelineCulture {
  return {
    id: culture.id,
    region: culture.region,
    name: culture.name,
    nativeName: culture.nativeName,
    periods: [defaultPeriod(culture)],
    phases: culture.phases.map(({ id, start, end }) => ({ id, start, end })),
    events: culture.events.map(({ id, start, type, title, disputed }) => ({ id, start, type, title, disputed })),
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
      .sort((a, b) => defaultPeriod(a).earliestStart - defaultPeriod(b).earliestStart || a.id.localeCompare(b.id));
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
