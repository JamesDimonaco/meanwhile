import type { Region } from "@/lib/data/schema";
import { REGION_COLOR } from "@/components/timeline/timeline-row";

/** The region's timeline colour, beside its name. Decorative: the name is always written out. */
export function RegionDot({ region }: { region: Region }) {
  return (
    <span
      aria-hidden
      className="inline-block size-2 shrink-0 rounded-full align-middle ring-1 ring-foreground/15"
      style={{ backgroundColor: REGION_COLOR[region] }}
    />
  );
}
