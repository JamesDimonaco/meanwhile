"use client";

import { useSearchParams } from "next/navigation";
import type { Culture } from "@/lib/data/schema";
import { parseYearParam } from "@/lib/years";
import { YearText } from "@/components/settings/year-text";

/**
 * Stub: the timeline agent builds the SVG world timeline here. The selected
 * year lives in ?year= (astronomical integer) so links are shareable; it is
 * read on the client because a static export has no request.
 */
export function WorldTimeline({ cultures }: { cultures: Culture[] }) {
  const year = parseYearParam(useSearchParams().get("year"));
  return (
    <div>
      {year !== null && <YearText year={year} />}
      <p>{cultures.length}</p>
    </div>
  );
}
