// Row layout shared by the frozen name column and the scrollable SVG, so the
// two stay pixel-aligned without any DOM measuring.

import { defaultPeriod } from "@/lib/data/queries";
import { REGIONS, type Culture, type Region } from "@/lib/data/schema";

export const HEADER_ROW_HEIGHT = 24;
export const CULTURE_ROW_HEIGHT = 22;

export type TimelineRow =
  | { kind: "region"; region: Region; y: number; height: number }
  | { kind: "culture"; culture: Culture; y: number; height: number };

/** One row per region header plus one per culture, top to bottom, region order fixed by REGIONS. */
export function layoutRows(cultures: readonly Culture[]): { rows: TimelineRow[]; totalHeight: number } {
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
