import { boxContains, type LonLatBox } from "@/lib/map/geo";
import { LAND_DIR, landFrame, type LandMap } from "@/lib/map/land";
import { issues } from "./issues";
import { Land } from "./schema";
import type { DataFile } from "./validate";

export const WHOLE_GLOBE: LonLatBox = [-180, -90, 180, 90];

/** A land file cut this much wider than its map's frame (in either direction) is coarser than the map could show. */
const STALE_RATIO = 1.5;

const rerun = (id: string) => `run pnpm land <ne_10m_land.shp> ${id}`;

/**
 * Every map's land file exists and still covers the frame the map draws. Pure
 * so it can be tested; readDataset feeds it the files on disk.
 */
export function validateLand(landFiles: readonly DataFile[], maps: readonly LandMap[]): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const byPath = new Map(landFiles.map((f) => [f.path, f]));
  const used = new Set<string>();

  for (const map of maps) {
    const path = `${LAND_DIR}/${map.id}.json`;
    used.add(path);
    const file = byPath.get(path);
    if (!file) {
      errors.push(`${path}: missing, so the map for "${map.id}" has no land; ${rerun(map.id)}`);
      continue;
    }
    const parsed = Land.safeParse(file.data);
    if (!parsed.success) {
      errors.push(...issues(path, parsed.error));
      continue;
    }
    const { bounds } = landFrame(map);
    const bbox = parsed.data.bbox;
    if (bounds === null) {
      if (!boxContains(bbox, WHOLE_GLOBE)) errors.push(`${path}: the map's frame reaches off the globe but the file is cut to a box; ${rerun(map.id)}`);
      continue;
    }
    if (!boxContains(bbox, bounds)) {
      errors.push(`${path}: the map's frame has moved outside the cut (its pins or borders changed); ${rerun(map.id)}`);
      continue;
    }
    const wider = (bbox[2] - bbox[0]) / (bounds[2] - bounds[0]);
    const taller = (bbox[3] - bbox[1]) / (bounds[3] - bounds[1]);
    if (Math.max(wider, taller) > STALE_RATIO) warnings.push(`${path}: cut for a wider frame than the map now draws, so its coast is coarser than it could be; ${rerun(map.id)}`);
  }

  for (const file of landFiles) {
    if (!used.has(file.path)) warnings.push(`${file.path}: no map uses it; pnpm land with no ids deletes it`);
  }
  return { errors, warnings };
}
