import type { Borders, Place } from "@/lib/data/schema";
import type { War } from "@/lib/data/war-schema";
import { frameBounds, type LonLatBox, mapExtent, mapProjection, metresPerPixel } from "./geo";

// What each map's land file must cover, shared by scripts/build-land.ts (which
// cuts it) and validate-land.ts (which checks the cut still fits the map).

export const LAND_DIR = "public/geo/land";

/** A map whose land file is public/geo/land/<id>.json: a culture with a borders file, or any war. */
export type LandMap = { id: string; borders: Pick<Borders, "snapshots"> | null; pins: readonly Place[] };

/** Every map in the data: cultures and wars with borders fit their polities, wars fit their pins too. */
export function landMaps(borders: readonly Borders[], wars: readonly War[]): LandMap[] {
  const byOwner = new Map(borders.map((b) => [b.cultureId ?? b.warId, b]));
  const cultures = borders.flatMap((b) => (b.cultureId === undefined ? [] : [{ id: b.cultureId, borders: b, pins: [] }]));
  const warMaps = wars.map((w) => ({ id: w.id, borders: byOwner.get(w.id) ?? null, pins: w.events.map((e) => e.place) }));
  return [...cultures, ...warMaps];
}

export type LandFrame = {
  /** The lon/lat box the map can show, or null when its frame reaches off the globe. */
  bounds: LonLatBox | null;
  /** Ground distance one px covers at the map's middle: what detail the coast needs. */
  metresPerPixel: number;
};

export function landFrame(map: LandMap): LandFrame {
  const projection = mapProjection(mapExtent(map.borders, map.pins));
  return { bounds: frameBounds(projection), metresPerPixel: metresPerPixel(projection) };
}
