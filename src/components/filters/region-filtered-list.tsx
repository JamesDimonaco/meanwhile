"use client";

import type { ReactNode } from "react";
import type { Region } from "@/lib/data/schema";
import { NoneInRegions } from "./region-chips";
import { includesRegion } from "./region-filter";
import { useRegionFilter } from "./use-region-filter";

/** A server-rendered list, trimmed on the client to the regions this device picked. */
export function RegionFilteredList({
  available,
  items,
  className,
}: {
  available: readonly Region[];
  items: { id: string; region: Region; node: ReactNode }[];
  className?: string;
}) {
  const selection = useRegionFilter(available);
  const shown = items.filter((item) => includesRegion(selection, item.region));
  if (shown.length === 0) return <NoneInRegions message="noneInRegions" />;
  return (
    <ul className={className}>
      {shown.map((item) => (
        <li key={item.id}>{item.node}</li>
      ))}
    </ul>
  );
}
