// Pure geometry and interaction math for the world timeline, kept separate
// from rendering so it can be unit-tested without a DOM.

import { scaleLinear } from "d3-scale";
import { rankActive } from "@/lib/data/queries";
import { parseYearParam } from "@/lib/years";
import type { TimelineCulture } from "./timeline-layout";

type PeriodBounds = { earliestStart: number; latestStart: number; earliestEnd: number; latestEnd: number };
type PhaseBounds = { id: string; start: number; end: number };

export type BarSegment =
  | { kind: "fade-in" | "fade-out" | "solid"; start: number; end: number }
  | { kind: "phase"; start: number; end: number; phaseId: string };

/**
 * The bar for one culture or war: a fuzzy fade across each edge's
 * uncertainty window, and a solid middle - or, when phases exist (Rome), the
 * middle replaced by one segment per phase. A window with no width (a sharp edge,
 * or fuzzy windows that overlap and leave no solid gap) is dropped rather
 * than drawn as a zero-width segment.
 */
export function barSegments(period: PeriodBounds, phases: readonly PhaseBounds[]): BarSegment[] {
  const segments: BarSegment[] = [];
  if (period.earliestStart < period.latestStart) {
    segments.push({ kind: "fade-in", start: period.earliestStart, end: period.latestStart });
  }
  if (phases.length > 0) {
    for (const phase of phases) {
      // Clipped to the solid middle: a phase drawn over a fade would hide that edge's uncertainty.
      const start = Math.max(phase.start, period.latestStart);
      const end = Math.min(phase.end, period.earliestEnd);
      if (start < end) segments.push({ kind: "phase", start, end, phaseId: phase.id });
    }
  } else if (period.latestStart < period.earliestEnd) {
    segments.push({ kind: "solid", start: period.latestStart, end: period.earliestEnd });
  }
  if (period.earliestEnd < period.latestEnd) {
    segments.push({ kind: "fade-out", start: period.earliestEnd, end: period.latestEnd });
  }
  return segments;
}

const FALLBACK_DOMAIN: [number, number] = [-2000, 2000];

/** The year axis domain: earliest start to latest end across every range given. */
export function computeYearDomain(ranges: readonly { earliestStart: number; latestEnd: number }[]): [number, number] {
  if (ranges.length === 0) return FALLBACK_DOMAIN;
  let min = ranges[0].earliestStart;
  let max = ranges[0].latestEnd;
  for (const r of ranges) {
    if (r.earliestStart < min) min = r.earliestStart;
    if (r.latestEnd > max) max = r.latestEnd;
  }
  return [min, max];
}

/**
 * Axis tick years (astronomical) that land on round *displayed* years:
 * d3's round -1000 is shown as 1001 BCE, so BCE ticks shift by one, and
 * the tick at 0 (not a displayed year) becomes 1 CE.
 */
export function axisTicks(domain: [number, number], count: number): number[] {
  return scaleLinear()
    .domain(domain)
    .ticks(count)
    .map((t) => (t <= 0 ? t + 1 : t))
    .filter((t) => t >= domain[0] && t <= domain[1]);
}

/** Half the widest axis label ("公元前1000年" at 10px), in pixels. */
export const TICK_EDGE = 40;

/** A tick's label anchor: centred, except where centring would push it out of the chart. */
export function tickAnchor(x: number, width: number): "start" | "middle" | "end" {
  if (x < TICK_EDGE) return "start";
  if (x > width - TICK_EDGE) return "end";
  return "middle";
}

/** Years moved per Page Up/Down press on the year line. */
export const YEAR_STEP_PAGE = 10;

/** The year delta for a keydown on the year-line slider, or null if this key isn't handled. */
export function yearStepForKey(key: string): number | null {
  switch (key) {
    case "ArrowRight":
    case "ArrowUp":
      return 1;
    case "ArrowLeft":
    case "ArrowDown":
      return -1;
    case "PageUp":
      return YEAR_STEP_PAGE;
    case "PageDown":
      return -YEAR_STEP_PAGE;
    default:
      return null;
  }
}

export function clampYear(year: number, [min, max]: [number, number]): number {
  return Math.min(max, Math.max(min, Math.round(year)));
}

export const MIN_PX_PER_YEAR = 0.15;
export const MAX_PX_PER_YEAR = 12;

/** Keeps the zoom level (pixels per year) inside a readable, cheap-to-render range; a country's chart floors it at its whole span. */
export function clampZoom(pxPerYear: number, min = MIN_PX_PER_YEAR): number {
  return Math.min(MAX_PX_PER_YEAR, Math.max(min, pxPerYear));
}

/** The zoom at which the whole domain fills `width` pixels. */
export function fitZoom([min, max]: [number, number], width: number): number {
  return Math.min(MAX_PX_PER_YEAR, width / (max - min));
}

const DOMAIN_PAD = 0.05;
const MIN_DOMAIN_PAD = 10;

/** Room either side of a country's span, so its first and last bars don't sit on the frame. */
export function padDomain([min, max]: [number, number]): [number, number] {
  const pad = Math.max(MIN_DOMAIN_PAD, Math.round((max - min) * DOMAIN_PAD));
  return [min - pad, max + pad];
}

/** The narrowest a bar is drawn, so a one-year war on a 4,000-year axis still shows. */
export const MIN_BAR_WIDTH = 6;
/** The narrowest a bar's tap target is. */
export const BAR_HIT_WIDTH = 32;

/** x0..x1 widened about its centre to at least `min` pixels. */
export function atLeast(x0: number, x1: number, min: number): { x: number; width: number } {
  const width = x1 - x0;
  return width >= min ? { x: x0, width } : { x: (x0 + x1 - min) / 2, width: min };
}

/** The bars alive in a year, in the order given; `certain` inside the solid part. */
export function activeBars<B extends { period: PeriodBounds }>(bars: readonly B[], year: number): { bar: B; certain: boolean }[] {
  return bars
    .filter(({ period: p }) => p.earliestStart <= year && year <= p.latestEnd)
    .map((bar) => ({ bar, certain: bar.period.latestStart <= year && year <= bar.period.earliestEnd }));
}

type TimelineActiveCulture = { culture: TimelineCulture; certain: boolean };

/** queries.ts's activeAt over the timeline's already-slim culture shape. */
export function activeCultures(cultures: readonly TimelineCulture[], year: number): TimelineActiveCulture[] {
  return rankActive(cultures, (c) => c.period, year).map(({ item, certain }) => ({ culture: item, certain }));
}

export function yearFromParam(param: string | null, fallback: number, domain: [number, number]): number {
  return clampYear(parseYearParam(param) ?? fallback, domain);
}

/** The timeline's query string from the current one; `yearChanged` when the write changes ?year=, which is when Next echoes it. */
export function timelineQuery(
  search: string,
  year: number,
  regions: string | null,
): { query: string; yearChanged: boolean } {
  const params = new URLSearchParams(search);
  const yearChanged = params.get("year") !== String(year);
  params.set("year", String(year));
  if (regions === null) params.delete("regions");
  else params.set("regions", regions);
  return { query: params.toString().replace(/%2C/g, ","), yearChanged };
}

/**
 * Whether a changed ?year= is the echo of our own write, which is never a
 * navigation however late it lands: the component replaceStates ?year= after
 * a move, and Next hands that back through useSearchParams in a transition
 * that can render after a newer move. `unechoed` holds the ?year= values
 * written whose echo hasn't come back, oldest first.
 */
export function takeEcho(unechoed: readonly string[], param: string | null): { echo: boolean; unechoed: string[] } {
  // Echoes arrive in write order, so an echo also accounts for every older write.
  const i = param === null ? -1 : unechoed.indexOf(param);
  return i === -1 ? { echo: false, unechoed: [...unechoed] } : { echo: true, unechoed: unechoed.slice(i + 1) };
}
