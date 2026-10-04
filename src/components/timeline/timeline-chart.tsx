"use client";

import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { scaleLinear, type ScaleLinear } from "d3-scale";
import { ZoomIn, ZoomOut } from "lucide-react";
import { REGIONS } from "@/lib/data/regions";
import { formatYear } from "@/lib/years";
import { useSettings } from "@/components/settings/use-settings";
import { YearText } from "@/components/settings/year-text";
import { Button } from "@/components/ui/button";
import type { TimelineRow } from "./timeline-layout";
import { MAX_PX_PER_YEAR, MIN_PX_PER_YEAR, axisTicks, clampYear, clampZoom, fitZoom, tickAnchor, yearStepForKey } from "./timeline-math";
import { FadeGradients, REGION_COLOR, WAR_COLOR } from "./timeline-row";

const NAME_COL_WIDTH = 112;
const AXIS_SPACE = 16;
/** Room for the axis labels, then the draggable year-line handle, above the rows. */
const TOP_SPACE = AXIS_SPACE + 16;
const ZOOM_FACTOR = 1.5;
/** How far from the left edge the year line sits in the visible chart, so there's more room to see what's ahead than behind. */
const YEAR_LINE_POSITION = 1 / 3;
/** Roughly one axis label per this many pixels, wide enough for "公元前1000年". */
const TICK_SPACING = 120;
/** A touch that moves less than this is a tap on the chart, not a scroll. */
const TAP_SLOP = 8;
/** The chart's width on a 360px phone, for a fitted chart's prerendered zoom before it can measure itself. */
const PHONE_CHART_WIDTH = 208;

type ItemRow<T, G> = Extract<TimelineRow<T, G>, { kind: "item" }>;

const rowKey = <T extends { id: string }, G extends string>(row: TimelineRow<T, G>) =>
  row.kind === "header" ? `header:${row.group}` : `item:${row.item.id}`;

/**
 * The timeline's machinery, shared by the world timeline and the country
 * pages: the year and zoom bar, a frozen name column, a horizontally
 * scrolling chart with an axis, and a year line dragged by its handle (or
 * by mouse anywhere, or a tap on the chart). `fit` opens zoomed so that
 * range fills the screen, and never zooms out past the whole domain.
 */
export function TimelineChart<T extends { id: string }, G extends string>({
  rows,
  totalHeight,
  domain,
  year,
  onYear,
  fit,
  label,
  bars,
  controls,
}: {
  rows: TimelineRow<T, G>[];
  totalHeight: number;
  domain: [number, number];
  year: number;
  onYear: (year: number) => void;
  fit?: [number, number];
  /** The frozen column's content for a row, absolutely placed at `top`. */
  label: (row: TimelineRow<T, G>, top: number) => ReactNode;
  /** A row's bar in the chart, drawn from the row's own y. */
  bars: (row: ItemRow<T, G>, xScale: ScaleLinear<number, number>) => ReactNode;
  /** Between the year bar and the chart (the world timeline's region chips). */
  controls?: ReactNode;
}) {
  const locale = useLocale();
  const { eraStyle } = useSettings();
  const t = useTranslations("timeline");

  const [minZoom, setMinZoom] = useState(() => (fit ? fitZoom(domain, PHONE_CHART_WIDTH) : MIN_PX_PER_YEAR));
  const [pxPerYear, setPxPerYear] = useState(() => (fit ? fitZoom(fit, PHONE_CHART_WIDTH) : minZoom));
  const chartWidth = Math.max(1, Math.round((domain[1] - domain[0]) * pxPerYear));
  const xScale = useMemo(() => scaleLinear().domain(domain).range([0, chartWidth]), [domain, chartWidth]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const tapStartRef = useRef<number | null>(null);
  const lastZoomRef = useRef<number | null>(null);
  const yearX = xScale(year);

  // Measured before paint, so a fitted chart never shows its phone-width guess on a wider screen.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!fit || !el) return;
    setMinZoom(fitZoom(domain, el.clientWidth));
    setPxPerYear(fitZoom(fit, el.clientWidth));
  }, [fit, domain]);

  // Put the year line a third of the way into view on first render and after
  // every zoom, so a phone never opens on an empty stretch of chart with the
  // line off-screen; after that, follow the line only when a key press or a
  // marker moves it out of view.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const zoomed = lastZoomRef.current !== pxPerYear;
    lastZoomRef.current = pxPerYear;
    if (zoomed || yearX < el.scrollLeft || yearX > el.scrollLeft + el.clientWidth) {
      el.scrollLeft = yearX - el.clientWidth * YEAR_LINE_POSITION;
    }
  }, [pxPerYear, yearX]);

  const moveYear = (next: number | null) => {
    if (next !== null) onYear(next);
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

  // Pinch-to-zoom on a trackpad arrives as a ctrl+wheel event; preventDefault
  // needs a non-passive listener, which React's onWheel can't give us.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      setPxPerYear((z) => clampZoom(z * (e.deltaY < 0 ? 1.08 : 1 / 1.08), minZoom));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [minZoom]);

  const svgHeight = totalHeight + TOP_SPACE;
  const ticks = axisTicks(domain, Math.max(2, Math.floor(chartWidth / TICK_SPACING)));

  // A fragment, not a wrapper: the sticky year bar stays pinned for as long as
  // its parent is on screen, and the parent also holds the year panel.
  return (
    <>
      <div className="sticky top-0 z-10 -mx-4 flex items-center justify-between gap-2 bg-background px-4 py-2">
        <div className="flex flex-col">
          <output className="text-lg font-semibold tabular-nums">
            <YearText year={year} />
          </output>
          <p className="text-xs text-muted-foreground">{t("yearLine")}</p>
        </div>
        <div className="flex gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label={t("zoomOut")}
            disabled={pxPerYear <= minZoom}
            onClick={() => setPxPerYear((z) => clampZoom(z / ZOOM_FACTOR, minZoom))}
          >
            <ZoomOut />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label={t("zoomIn")}
            disabled={pxPerYear >= MAX_PX_PER_YEAR}
            onClick={() => setPxPerYear((z) => clampZoom(z * ZOOM_FACTOR, minZoom))}
          >
            <ZoomIn />
          </Button>
        </div>
      </div>

      {controls}

      <div className="flex gap-2">
        <div className="relative shrink-0" style={{ width: NAME_COL_WIDTH, height: svgHeight }}>
          {rows.map((row) => (
            <Fragment key={rowKey(row)}>{label(row, row.y + TOP_SPACE)}</Fragment>
          ))}
        </div>

        <div ref={scrollRef} className="grow overflow-x-auto">
          <svg width={chartWidth} height={svgHeight} className="block">
            <defs>
              {REGIONS.map((region) => (
                <FadeGradients key={region} id={`tl-fade-${region}`} color={REGION_COLOR[region]} />
              ))}
              <FadeGradients id="tl-fade-war" color={WAR_COLOR} />
            </defs>
            <g className="fill-muted-foreground text-[10px]">
              {ticks.map((tick) => (
                <text key={tick} x={xScale(tick)} y={AXIS_SPACE / 2} dy="0.35em" textAnchor={tickAnchor(xScale(tick), chartWidth)}>
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
              {rows.map((row) => (row.kind === "item" ? <Fragment key={rowKey(row)}>{bars(row, xScale)}</Fragment> : null))}
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
    </>
  );
}
