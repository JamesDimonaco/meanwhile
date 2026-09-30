// Pure geometry and interaction math for the world timeline, kept separate
// from rendering so it can be unit-tested without a DOM.

import { scaleLinear } from "d3-scale";
import { REGIONS, type Region } from "@/lib/data/schema";
import type { TimelineCulture } from "./timeline-layout";

type PeriodBounds = { earliestStart: number; latestStart: number; earliestEnd: number; latestEnd: number };
type PhaseBounds = { id: string; start: number; end: number };

export type BarSegment =
  | { kind: "fade-in" | "fade-out" | "solid"; start: number; end: number }
  | { kind: "phase"; start: number; end: number; phaseId: string };

/**
 * The bar for one culture: a fuzzy fade across each edge's uncertainty
 * window, and a solid middle - or, when phases exist (Rome), the middle
 * replaced by one segment per phase. A window with no width (a sharp edge,
 * or fuzzy windows that overlap and leave no solid gap) is dropped rather
 * than drawn as a zero-width segment.
 */
export function barSegments(period: PeriodBounds, phases: readonly PhaseBounds[]): BarSegment[] {
  const segments: BarSegment[] = [];
  if (period.earliestStart < period.latestStart) {
    segments.push({ kind: "fade-in", start: period.earliestStart, end: period.latestStart });
  }
  if (phases.length > 0) {
    for (const phase of phases) segments.push({ kind: "phase", start: phase.start, end: phase.end, phaseId: phase.id });
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

/** Keeps the zoom level (pixels per year) inside a readable, cheap-to-render range. */
export function clampZoom(pxPerYear: number): number {
  return Math.min(MAX_PX_PER_YEAR, Math.max(MIN_PX_PER_YEAR, pxPerYear));
}

const regionRank = (r: Region) => REGIONS.indexOf(r);
const outer = (p: PeriodBounds): [number, number] => [p.earliestStart, p.latestEnd];
const core = (p: PeriodBounds): [number, number] => [p.latestStart, p.earliestEnd];
const likely = (p: PeriodBounds): number => (p.earliestStart + p.latestStart + p.earliestEnd + p.latestEnd) / 4;
const contains = ([lo, hi]: readonly [number, number], year: number) => lo <= year && year <= hi;

export type TimelineActiveCulture = { culture: TimelineCulture; certain: boolean };

/**
 * Cultures alive in a year: certain first (inside the solid part of the bar),
 * then by region, likely start, id. Mirrors queries.ts's activeAt, but over
 * the timeline's own already-slim culture shape instead of the full dataset.
 */
export function activeCultures(cultures: readonly TimelineCulture[], year: number): TimelineActiveCulture[] {
  return cultures
    .filter((c) => contains(outer(c.period), year))
    .map((c) => ({ culture: c, certain: contains(core(c.period), year), start: likely(c.period) }))
    .sort(
      (a, b) =>
        Number(b.certain) - Number(a.certain) ||
        regionRank(a.culture.region) - regionRank(b.culture.region) ||
        a.start - b.start ||
        a.culture.id.localeCompare(b.culture.id),
    )
    .map(({ culture, certain }) => ({ culture, certain }));
}
