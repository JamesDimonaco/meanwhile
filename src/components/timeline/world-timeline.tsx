"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { scaleLinear } from "d3-scale";
import { ZoomIn, ZoomOut } from "lucide-react";
import type { Culture, CultureEvent } from "@/lib/data/schema";
import { REGIONS } from "@/lib/data/schema";
import { activeAt, defaultPeriod } from "@/lib/data/queries";
import { formatYear, parseYearParam } from "@/lib/years";
import { useSettings } from "@/components/settings/use-settings";
import { Button } from "@/components/ui/button";
import { layoutRows } from "./timeline-layout";
import {
  MAX_PX_PER_YEAR,
  MIN_PX_PER_YEAR,
  clampYear,
  clampZoom,
  computeYearDomain,
  yearStepForKey,
} from "./timeline-math";
import { CultureLabel, CultureRow, REGION_COLOR, RegionHeaderLabel } from "./timeline-row";
import { YearPanel, type SelectedEvent } from "./year-panel";

const NAME_COL_WIDTH = 104;
/** Vertical room above the rows for the draggable year-line handle. */
const HANDLE_SPACE = 16;
const DEFAULT_PX_PER_YEAR = 1;
const ZOOM_FACTOR = 1.5;

/**
 * ?year= (astronomical, e.g. -1199 = 1200 BCE) so the year line is shareable.
 * The selected year is read once on mount and otherwise owned by this
 * component; a static export has no server to keep it in sync with.
 */
export function WorldTimeline({ cultures }: { cultures: Culture[] }) {
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
    return clampYear(paramYear ?? domain[1], domain);
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
  const draggingRef = useRef(false);

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
  const handleBodyPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    draggingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    const next = yearFromClientX(e.clientX);
    if (next !== null) setYear(next);
  };
  const handleHandlePointerDown = (e: React.PointerEvent) => {
    draggingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    const next = yearFromClientX(e.clientX);
    if (next !== null) setYear(next);
  };
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    const next = yearFromClientX(e.clientX);
    if (next !== null) setYear(next);
  };
  const endDrag = () => {
    draggingRef.current = false;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const delta = yearStepForKey(e.key);
    if (delta === null) return;
    e.preventDefault();
    setYear(clampYear(year + delta, domain));
  };

  const handleSelectEvent = useCallback(
    (culture: Culture, event: CultureEvent) => {
      setYear(clampYear(event.start, domain));
      setSelected({ culture, event });
    },
    [domain],
  );

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

  const svgHeight = totalHeight + HANDLE_SPACE;
  const yearX = xScale(year);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">{t("yearLine")}</p>
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
        <svg width={NAME_COL_WIDTH} height={svgHeight} className="shrink-0">
          <g transform={`translate(0, ${HANDLE_SPACE})`}>
            {rows.map((row) =>
              row.kind === "region" ? (
                <RegionHeaderLabel key={row.region} region={row.region} y={row.y} height={row.height} />
              ) : (
                <CultureLabel key={row.culture.id} culture={row.culture} y={row.y} height={row.height} />
              ),
            )}
          </g>
        </svg>

        <div ref={scrollRef} className="grow overflow-x-auto">
          <svg width={chartWidth} height={svgHeight} className="block">
            <defs>
              {REGIONS.map((region) => (
                <FadeGradients key={region} region={region} />
              ))}
            </defs>
            <rect
              x={0}
              y={HANDLE_SPACE}
              width={chartWidth}
              height={totalHeight}
              fill="transparent"
              className="cursor-ew-resize"
              onPointerDown={handleBodyPointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
            />
            <g transform={`translate(0, ${HANDLE_SPACE})`}>
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
              y1={0}
              y2={svgHeight}
              stroke="var(--primary)"
              strokeWidth={1.5}
              pointerEvents="none"
            />
            <circle
              cx={yearX}
              cy={HANDLE_SPACE / 2}
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

      <YearPanel year={year} active={active} selected={selected} onClose={() => setSelected(null)} />
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

