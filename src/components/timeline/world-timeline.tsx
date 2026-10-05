"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ReadonlyURLSearchParams } from "next/navigation";
import { RegionChips, NoneInRegions } from "@/components/filters/region-chips";
import { includesRegion, parseRegionsParam, regionsIn, regionsParam } from "@/components/filters/region-filter";
import { REGION_STORAGE_KEY, saveRegionFilter, useRegionFilter } from "@/components/filters/use-region-filter";
import type { Region } from "@/lib/data/schema";
import { TimelineChart, usePrerendered } from "./timeline-chart";
import { layoutRows, type TimelineCulture, type TimelineEvent } from "./timeline-layout";
import { activeCultures, clampYear, computeYearDomain } from "./timeline-math";
import { CultureLabel, CultureRow, REGION_COLOR, RegionHeaderLabel } from "./timeline-row";
import { useYearParam } from "./use-year-param";
import { YearPanel, type SelectedEvent } from "./year-panel";

/** Where the year line starts without ?year=: 1 CE has most regions alive at once. */
const DEFAULT_YEAR = 1;

const WAIT_STYLE_ID = "world-timeline-wait";
/**
 * Runs before the prerendered timeline is parsed. The HTML shows every region
 * at DEFAULT_YEAR; a ?year=, ?regions= or saved filter changes that once the
 * query is read after hydration, and showing the prerendered view first would
 * shift the page then. So in those cases it hides the timeline (keeping its
 * space) until the effect below has applied them, and the footer with it,
 * which a short filtered timeline would otherwise pull up into view.
 */
const HIDE_UNTIL_QUERY_READ = `(function(){var w=/[?&](year|regions)=/.test(location.search);try{w=w||JSON.parse(localStorage.getItem(${JSON.stringify(REGION_STORAGE_KEY)})||"[]").length>0}catch(e){}if(w){var s=document.createElement("style");s.id="${WAIT_STYLE_ID}";s.textContent="[data-world-timeline],footer{visibility:hidden}";document.head.appendChild(s)}})()`;

/**
 * Every culture by region, with ?year= and ?regions= (e.g. china,europe;
 * absent = the device's stored filter) so a shared link keeps the view.
 * ?regions= is read on mount only; after that this component owns it.
 */
export function WorldTimeline({ cultures }: { cultures: TimelineCulture[] }) {
  const available = useMemo(() => regionsIn(cultures), [cultures]);
  const storedRegions = useRegionFilter(available);
  const [linkRegions, setLinkRegions] = useState<Region[] | null>(null);
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
  const [queryRead, setQueryRead] = useState(false);
  const queryReadRef = useRef(false);
  const readRegions = useCallback(
    (params: ReadonlyURLSearchParams) => {
      if (queryReadRef.current) return;
      queryReadRef.current = true;
      setQueryRead(true);
      // A chip tapped before the query was read wins over the link's ?regions=.
      setLinkRegions((current) => current ?? parseRegionsParam(params.get("regions"), available));
    },
    [available],
  );
  const [year, setYear, query] = useYearParam(domain, DEFAULT_YEAR, regionsParam(regions), {
    onFollow: clearSelected,
    onQuery: readRegions,
  });
  const prerendered = usePrerendered();

  // A layout effect, like useYearParam's follow of ?year=: the timeline
  // reappears in the same paint as the link's year and regions.
  useLayoutEffect(() => {
    if (queryRead) document.getElementById(WAIT_STYLE_ID)?.remove();
  }, [queryRead]);

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
    <>
      {prerendered && <script dangerouslySetInnerHTML={{ __html: HIDE_UNTIL_QUERY_READ }} />}
      <div data-world-timeline className="flex flex-col gap-3">
        <TimelineChart
          rows={rows}
          totalHeight={totalHeight}
          domain={domain}
          year={year}
          onYear={moveYear}
          query={query}
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
    </>
  );
}
