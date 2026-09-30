"use client";

import { useMemo, type ReactNode } from "react";
import { pickMeanwhile, type MeanwhileCandidate } from "@/lib/data/queries";
import type { Region } from "@/lib/data/schema";
import { NoneInRegions, StoredRegionChips } from "@/components/filters/region-chips";
import { includesRegion } from "@/components/filters/region-filter";
import { useRegionFilter } from "@/components/filters/use-region-filter";

/** Which regions the meanwhile cards come from, and the cards picked for them. */
export function MeanwhileFilter({
  candidates,
  anchorRegion,
  regions,
  cards,
}: {
  candidates: MeanwhileCandidate[];
  anchorRegion: Region;
  regions: Region[];
  cards: Record<string, ReactNode>;
}) {
  const selection = useRegionFilter(regions);
  const picked = useMemo(
    () => pickMeanwhile(candidates.filter((c) => includesRegion(selection, c.region)), anchorRegion),
    [candidates, selection, anchorRegion],
  );

  return (
    <div className="flex flex-col gap-3">
      <StoredRegionChips available={regions} />
      {picked.length === 0 ? (
        <NoneInRegions message="noneInRegions" />
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {picked.map((id) => (
            <li key={id}>{cards[id]}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
