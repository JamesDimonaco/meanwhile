"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { scaleLinear } from "d3-scale";
import { ZoomIn, ZoomOut } from "lucide-react";
import { REGIONS } from "@/lib/data/schema";
import { activeAt, defaultPeriod } from "@/lib/data/queries";
import { formatYear, parseYearParam } from "@/lib/years";
import { useSettings } from "@/components/settings/use-settings";
import { Button } from "@/components/ui/button";
import { layoutRows, type TimelineCulture, type TimelineEvent } from "./timeline-layout";
import {
  MAX_PX_PER_YEAR,
  MIN_PX_PER_YEAR,
  axisTicks,
  clampYear,
  clampZoom,
  computeYearDomain,
  yearStepForKey,
} from "./timeline-math";
import { CultureLabel, CultureRow, REGION_COLOR, RegionHeaderLabel } from "./timeline-row";
import { YearPanel, type SelectedEvent } from "./year-panel";

const NAME_COL_WIDTH = 112;
const AXIS_SPACE = 16;
/** Room for the axis labels, then the draggable year-line handle, above the rows. */
const TOP_SPACE = AXIS_SPACE + 16;
const DEFAULT_PX_PER_YEAR = 1;
const ZOOM_FACTOR = 1.5;
/** Roughly one axis label per this many pixels, wide enough for "公元前1000年". */
const TICK_SPACING = 120;
/** Where the year line starts without ?year=: 1 CE has most regions alive at once. */
const DEFAULT_YEAR = 1;
/** A touch that moves less than this is a tap on the chart, not a scroll. */
const TAP_SLOP = 8;

/**
 * ?year= (astronomical, e.g. -1199 = 1200 BCE) so the year line is shareable.
 * The selected year is read once on mount and otherwise owned by this
 * component; the page is prerendered, so no server keeps it in sync.
 */
export function WorldTimeline({ cultures }: { cultures: TimelineCulture[] }) {
  const locale = useLocale();
  const { eraStyle } = useSettings();
  const t = useTranslations("timeline");
  const searchParams = useSearchParams();

  const domain = useMemo(() => computeYearDomain(cultures.map(defaultPeriod)), [cultures]);
  const { rows, totalHeight } = useMemo(() => layoutRows(cultures), [cultures]);

  const [pxPerYear, setPxPerYear] = useState(DEFAULT_PX_PER_YEAR);
  const chartWidth = Math.max(1, Math.round((domain[1] - domain[0]) * pxPerYear));
  const xScale = useMemo(() => scaleLinear().domain(domain).range([0, chartWidth]), [domain, chartWidth]);

  const [year, setYear] = useState<number>(() => {
    const paramYear = parseYearParam(searchParams.get("year"));
    return clampYear(paramYear ?? DEFAULT_YEAR, domain);
  });
  const [selected, setSelected] = useState<SelectedEvent | null>(null);

  // Keep the URL shareable. Not required for the page to work, so a failure
  // (e.g. History API unavailable) is silently ignored.
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      params.set("year", String(year));
      window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
    } catch {
      // Ignore.
    }
  }, [year]);

  const active = useMemo(() => activeAt(cultures, year), [cultures, year]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const tapStartRef = useRef<number | null>(null);
  const lastZoomRef = useRef<number | null>(null);
  const yearX = xScale(year);

  // Centre the year line on first render and after every zoom, so a phone
  // never opens on an empty stretch of chart with the line off-screen; after
  // that, follow the line only when a key press or a marker moves it out of view.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const zoomed = lastZoomRef.current !== pxPerYear;
    lastZoomRef.current = pxPerYear;
    if (zoomed || yearX < el.scrollLeft || yearX > el.scrollLeft + el.clientWidth) {
      el.scrollLeft = yearX - el.clientWidth / 2;
    }
  }, [pxPerYear, yearX]);

  // Any move of the line drops a tapped event, which belongs to its own year.
  const moveYear = (next: number | null) => {
    if (next === null) return;
    setYear(next);
    setSelected(null);
  };

  const yearFromClientX = useCallback(
    (clientX: number) => {
      const el = scrollRef.current;
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      return clampYear(xScale.invert(clientX - rect.left + el.scrollLeft), domain);
    },
    [xScale, domain],
  );

  // Mouse can drag from anywhere in the chart. Touch/pen only drag from the
  // handle (below): the chart body itself must stay swipeable to scroll.
  // A touch that ends without the browser taking it over as a scroll
  // (pointercancel) is a tap, and moves the line there.
  const handleBodyPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") {
      tapStartRef.current = e.clientX;
      return;
    }
    draggingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    moveYear(yearFromClientX(e.clientX));
  };
  const handleHandlePointerDown = (e: React.PointerEvent) => {
    draggingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    moveYear(yearFromClientX(e.clientX));
  };
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    moveYear(yearFromClientX(e.clientX));
  };
  const endDrag = () => {
    draggingRef.current = false;
    tapStartRef.current = null;
  };
  const handleBodyPointerUp = (e: React.PointerEvent) => {
    const start = tapStartRef.current;
    if (start !== null && Math.abs(e.clientX - start) < TAP_SLOP) {
      moveYear(yearFromClientX(e.clientX));
    }
    endDrag();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const delta = yearStepForKey(e.key);
    if (delta === null) return;
    e.preventDefault();
    moveYear(clampYear(year + delta, domain));
  };

  const handleSelectEvent = useCallback(
    (culture: TimelineCulture, event: TimelineEvent) => {
      setYear(clampYear(event.start, domain));
      setSelected({ culture, event });
    },
    [domain],
  );

  // The panel sits below every row; on a phone that's a screen or more away.
  useEffect(() => {
    if (selected) panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [selected]);

  // Pinch-to-zoom on a trackpad arrives as a ctrl+wheel event; preventDefault
  // needs a non-passive listener, which React's onWheel can't give us.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      setPxPerYear((z) => clampZoom(z * (e.deltaY < 0 ? 1.08 : 1 / 1.08)));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const svgHeight = totalHeight + TOP_SPACE;
  const ticks = axisTicks(domain, Math.max(2, Math.floor(chartWidth / TICK_SPACING)));

  return (
    <div className="flex flex-col gap-3">
      <div className="sticky top-0 z-10 -mx-4 flex items-center justify-between gap-2 bg-background px-4 py-2">
        <div className="flex flex-col">
          <output className="text-lg font-semibold tabular-nums">{formatYear(year, locale, eraStyle)}</output>
          <p className="text-xs text-muted-foreground">{t("yearLine")}</p>
        </div>
        <div className="flex gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label={t("zoomOut")}
            disabled={pxPerYear <= MIN_PX_PER_YEAR}
            onClick={() => setPxPerYear((z) => clampZoom(z / ZOOM_FACTOR))}
          >
            <ZoomOut />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label={t("zoomIn")}
            disabled={pxPerYear >= MAX_PX_PER_YEAR}
            onClick={() => setPxPerYear((z) => clampZoom(z * ZOOM_FACTOR))}
          >
            <ZoomIn />
          </Button>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="relative shrink-0" style={{ width: NAME_COL_WIDTH, height: svgHeight }}>
          {rows.map((row) =>
            row.kind === "region" ? (
              <RegionHeaderLabel key={row.region} region={row.region} y={row.y + TOP_SPACE} height={row.height} />
            ) : (
              <CultureLabel key={row.culture.id} culture={row.culture} y={row.y + TOP_SPACE} height={row.height} />
            ),
          )}
        </div>

        <div ref={scrollRef} className="grow overflow-x-auto">
          <svg width={chartWidth} height={svgHeight} className="block">
            <defs>
              {REGIONS.map((region) => (
                <FadeGradients key={region} region={region} />
              ))}
            </defs>
            <g className="fill-muted-foreground text-[10px]">
              {ticks.map((tick) => (
                <text key={tick} x={xScale(tick)} y={AXIS_SPACE / 2} dy="0.35em" textAnchor="middle">
                  {formatYear(tick, locale, eraStyle)}
                </text>
              ))}
            </g>
            <g stroke="var(--border)">
              {ticks.map((tick) => (
                <line key={tick} x1={xScale(tick)} x2={xScale(tick)} y1={TOP_SPACE} y2={svgHeight} />
              ))}
            </g>
            <rect
              x={0}
              y={TOP_SPACE}
              width={chartWidth}
              height={totalHeight}
              fill="transparent"
              className="cursor-ew-resize"
              onPointerDown={handleBodyPointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handleBodyPointerUp}
              onPointerCancel={endDrag}
            />
            <g transform={`translate(0, ${TOP_SPACE})`}>
              {rows.map((row) =>
                row.kind === "region" ? null : (
                  <CultureRow
                    key={row.culture.id}
                    culture={row.culture}
                    y={row.y}
                    height={row.height}
                    xScale={xScale}
                    selectedEventId={selected?.event.id ?? null}
                    onSelectEvent={handleSelectEvent}
                  />
                ),
              )}
            </g>
            <line
              x1={yearX}
              x2={yearX}
              y1={AXIS_SPACE}
              y2={svgHeight}
              stroke="var(--primary)"
              strokeWidth={1.5}
              pointerEvents="none"
            />
            <circle
              cx={yearX}
              cy={AXIS_SPACE + (TOP_SPACE - AXIS_SPACE) / 2}
              r={7}
              fill="var(--primary)"
              tabIndex={0}
              role="slider"
              aria-label={t("yearLine")}
              aria-orientation="horizontal"
              aria-valuemin={domain[0]}
              aria-valuemax={domain[1]}
              aria-valuenow={year}
              aria-valuetext={formatYear(year, locale, eraStyle)}
              onKeyDown={handleKeyDown}
              onPointerDown={handleHandlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              style={{ touchAction: "none" }}
              className="cursor-grab outline-none focus-visible:stroke-ring focus-visible:stroke-2"
            />
          </svg>
        </div>
      </div>

      <div ref={panelRef} className="scroll-mt-20">
        <YearPanel year={year} active={active} selected={selected} onClose={() => setSelected(null)} />
      </div>
    </div>
  );
}

function FadeGradients({ region }: { region: (typeof REGIONS)[number] }) {
  const color = REGION_COLOR[region];
  return (
    <>
      <linearGradient id={`tl-fade-in-${region}`} x1="0" x2="1" y1="0" y2="0">
        <stop offset="0" stopColor={color} stopOpacity={0} />
        <stop offset="1" stopColor={color} stopOpacity={1} />
      </linearGradient>
      <linearGradient id={`tl-fade-out-${region}`} x1="0" x2="1" y1="0" y2="0">
        <stop offset="0" stopColor={color} stopOpacity={1} />
        <stop offset="1" stopColor={color} stopOpacity={0} />
      </linearGradient>
    </>
  );
}

