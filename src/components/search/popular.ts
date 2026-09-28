import { REGIONS, type Culture } from "@/lib/data/schema";
import { toSearchEntry, type SearchEntry } from "./search-index";

export const MAX_POPULAR = 8;

/**
 * A shortlist of starting points for the home page, one region at a time
 * (round-robin, alphabetical by id within a region) so the list stays a
 * "popular" shortlist rather than the whole catalog once all ~50 cultures
 * land. Deterministic: same input always gives the same order.
 */
export function popularStartingPoints(cultures: readonly Culture[], limit = MAX_POPULAR): SearchEntry[] {
  const byRegion = REGIONS.map((region) =>
    cultures.filter((c) => c.region === region).sort((a, b) => a.id.localeCompare(b.id)),
  );

  const out: Culture[] = [];
  for (let round = 0; out.length < limit; round++) {
    const before = out.length;
    for (const group of byRegion) {
      if (group[round]) out.push(group[round]);
      if (out.length >= limit) break;
    }
    if (out.length === before) break; // every region exhausted
  }
  return out.slice(0, limit).map(toSearchEntry);
}
