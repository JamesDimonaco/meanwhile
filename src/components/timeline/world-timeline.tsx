"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { RegionChips, NoneInRegions } from "@/components/filters/region-chips";
import { includesRegion, parseRegionsParam, regionsIn, regionsParam } from "@/components/filters/region-filter";
import { saveRegionFilter, useRegionFilter } from "@/components/filters/use-region-filter";
import type { Region } from "@/lib/data/schema";
import { TimelineChart } from "./timeline-chart";
import { layoutRows, type TimelineCulture, type TimelineEvent } from "./timeline-layout";
import { activeCultures, clampYear, computeYearDomain } from "./timeline-math";
import { CultureLabel, CultureRow, REGION_COLOR, RegionHeaderLabel } from "./timeline-row";
import { useYearParam } from "./use-year-param";
import { YearPanel, type SelectedEvent } from "./year-panel";

/** Where the year line starts without ?year=: 1 CE has most regions alive at once. */
const DEFAULT_YEAR = 1;

/**
 * Every culture by region, with ?year= and ?regions= (e.g. china,europe;
 * absent = the device's stored filter) so a shared link keeps the view.
 * ?regions= is read on mount only; after that this component owns it.
 */
export function WorldTimeline({ cultures }: { cultures: TimelineCulture[] }) {
  const searchParams = useSearchParams();

  const available = useMemo(() => regionsIn(cultures), [cultures]);
  const storedRegions = useRegionFilter(available);
  const [linkRegions, setLinkRegions] = useState(() => parseRegionsParam(searchParams.get("regions"), available));
  const regions = linkRegions ?? storedRegions;
  const changeRegions = (next: Region[]) => {
    setLinkRegions(next);
    saveRegionFilter(next);
  };
  const shown = useMemo(() => cultures.filter((c) => includesRegion(regions, c.region)), [cultures, regions]);

  // The domain stays the whole dataset's, so filtering never moves the year line or the scroll.
  const domain = useMemo(() => computeYearDomain(cultures.map((c) => c.period)), [cultures]);
  const { rows, totalHeight } = useMemo(() => layoutRows(shown), [shown]);

  const [selected, setSelected] = useState<SelectedEvent | null>(null);
  const clearSelected = useCallback(() => setSelected(null), []);
  const [year, setYear] = useYearParam(domain, DEFAULT_YEAR, regionsParam(regions), clearSelected);

  const active = useMemo(() => activeCultures(shown, year), [shown, year]);
  const hiddenByFilter = useMemo(
    () => active.length === 0 && activeCultures(cultures, year).length > 0,
    [active, cultures, year],
  );

  const panelRef = useRef<HTMLDivElement>(null);

  // Any move of the line drops a tapped event, which belongs to its own year.
  const moveYear = (next: number) => {
    setYear(next);
    setSelected(null);
  };

  const handleSelectEvent = useCallback(
    (culture: TimelineCulture, event: TimelineEvent) => {
      setYear(clampYear(event.start, domain));
      setSelected({ culture, event });
    },
    [domain, setYear],
  );

  // The panel sits below every row; on a phone that's a screen or more away.
  useEffect(() => {
    if (selected) panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [selected]);

  return (
    <div className="flex flex-col gap-3">
      <TimelineChart
        rows={rows}
        totalHeight={totalHeight}
        domain={domain}
        year={year}
        onYear={moveYear}
        controls={<RegionChips available={available} selection={regions} onChange={changeRegions} />}
        label={(row, top) =>
          row.kind === "header" ? (
            <RegionHeaderLabel region={row.group} y={top} height={row.height} />
          ) : (
            <CultureLabel culture={row.item} y={top} height={row.height} />
          )
        }
        bars={(row, xScale) => (
          <CultureRow
            culture={row.item}
            y={row.y}
            height={row.height}
            xScale={xScale}
            selectedEventId={selected?.event.id ?? null}
            onSelectEvent={handleSelectEvent}
          />
        )}
      />

      <div ref={panelRef} className="scroll-mt-20">
        <YearPanel
          year={year}
          entries={active.map(({ culture, certain }) => ({
            id: culture.id,
            name: culture.name,
            href: `/c/${culture.id}`,
            span: { start: culture.period.latestStart, end: culture.period.earliestEnd, asOf: null },
            certain,
            color: REGION_COLOR[culture.region],
          }))}
          selected={selected}
          onClose={clearSelected}
          empty={hiddenByFilter ? <NoneInRegions message="noneInRegions" onShowAll={() => changeRegions([])} /> : undefined}
        />
      </div>
    </div>
  );
}
