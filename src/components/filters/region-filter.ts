import { REGIONS } from "@/lib/data/regions";
import type { Region } from "@/lib/data/schema";

// A selection is the regions someone picked, in display order. Empty means
// "All", and picking every region collapses back to empty, so each filter
// state has exactly one spelling in the URL and in storage.

/** The regions that have at least one culture: the chips to offer. */
export function regionsIn(cultures: readonly { region: Region }[]): Region[] {
  return REGIONS.filter((region) => cultures.some((c) => c.region === region));
}

export function normalizeSelection(values: readonly string[], available: readonly Region[]): Region[] {
  const picked = available.filter((region) => values.includes(region));
  return picked.length === available.length ? [] : picked;
}

/** null when the link has no ?regions=, so the stored choice applies. */
export function parseRegionsParam(value: string | null, available: readonly Region[]): Region[] | null {
  return value === null ? null : normalizeSelection(value.split(","), available);
}

/** null means drop the parameter (All). */
export function regionsParam(selection: readonly Region[]): string | null {
  return selection.length === 0 ? null : selection.join(",");
}

export function toggleRegion(selection: readonly Region[], region: Region, available: readonly Region[]): Region[] {
  const next = selection.includes(region) ? selection.filter((r) => r !== region) : [...selection, region];
  return normalizeSelection(next, available);
}

export function includesRegion(selection: readonly Region[], region: Region): boolean {
  return selection.length === 0 || selection.includes(region);
}
