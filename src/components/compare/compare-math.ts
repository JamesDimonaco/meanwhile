// Pure logic for the compare screen: how two or three cultures' dates line
// up, one merged, year-ordered list of their events, and the shared axis's
// labels. No DOM, so it's unit-tested directly.

import { scaleLinear } from "d3-scale";
import { axisTicks } from "@/components/timeline/timeline-math";

type PeriodBounds = { earliestStart: number; latestStart: number; earliestEnd: number; latestEnd: number };

/** Astronomical years throughout; `years` counts calendar years, both ends included. */
export type Overlap =
  | { kind: "overlap"; start: number; end: number; years: number }
  | { kind: "touching"; year: number }
  | { kind: "uncertain"; start: number; end: number }
  | { kind: "gap"; years: number };

/**
 * When every period was alive at once, judged on the solid part of each bar
 * (latestStart to earliestEnd), the same range the rest of the app prints.
 * If only the fuzzy edges meet, that's "uncertain"; otherwise a gap.
 */
export function overlapOf(periods: readonly PeriodBounds[]): Overlap {
  const start = Math.max(...periods.map((p) => p.latestStart));
  const end = Math.min(...periods.map((p) => p.earliestEnd));
  if (end > start) return { kind: "overlap", start, end, years: end - start + 1 };
  if (end === start) return { kind: "touching", year: start };

  const outerStart = Math.max(...periods.map((p) => p.earliestStart));
  const outerEnd = Math.min(...periods.map((p) => p.latestEnd));
  if (outerEnd >= outerStart) return { kind: "uncertain", start: outerStart, end: outerEnd };
  return { kind: "gap", years: start - end };
}

/** Events on different sides this close (in years) are shown side by side as "meanwhile". */
export const PAIR_WINDOW = 25;

type SpineEvent = { id: string; start: number };

/** One line of the spine: at most one event per side (cells[i] is side i), dated by its earliest event. */
export type SpineRow<E extends SpineEvent> = { year: number; cells: (E | null)[] };

export function isPaired(row: SpineRow<SpineEvent>): boolean {
  return row.cells.filter(Boolean).length >= 2;
}

const byStart = <E extends SpineEvent>(a: E, b: E) => a.start - b.start || a.id.localeCompare(b.id);

/**
 * Merges each side's events into one year-ordered list of rows, putting
 * events from different sides within PAIR_WINDOW of each other on the same
 * row. Sides are added one at a time, each aligned against the rows so far.
 */
export function buildSpine<E extends SpineEvent>(sides: readonly (readonly E[])[]): SpineRow<E>[] {
  let rows: SpineRow<E>[] = [];
  sides.forEach((events, side) => {
    const sorted = [...events].sort(byStart);
    const pairs = align(rows.length, sorted.length, (i, j, rowAbovePaired, eventAbovePaired) => {
      const row = rows[i];
      const event = sorted[j];
      const distance = Math.max(...row.cells.map((c) => (c ? Math.abs(c.start - event.start) : 0)));
      // Joining redates the row to its earliest event. An unpaired row or event
      // just above stays put, so refuse a pair that would date itself before it.
      const year = Math.min(row.year, event.start);
      if (!rowAbovePaired && rows[i - 1].year > year) return null;
      if (!eventAbovePaired && sorted[j - 1].start > year) return null;
      return distance <= PAIR_WINDOW ? distance : null;
    });

    const blank = (): (E | null)[] => sides.map(() => null);
    const next: SpineRow<E>[] = [];
    let r = 0;
    let e = 0;
    const flushUntil = (rowEnd: number, eventEnd: number) => {
      while (r < rowEnd || e < eventEnd) {
        const takeRow = e >= eventEnd || (r < rowEnd && rows[r].year <= sorted[e].start);
        if (takeRow) next.push(rows[r++]);
        else {
          const cells = blank();
          cells[side] = sorted[e];
          next.push({ year: sorted[e++].start, cells });
        }
      }
    };
    for (const [ri, ei] of pairs) {
      flushUntil(ri, ei);
      const row = rows[r++];
      const event = sorted[e++];
      const cells = [...row.cells];
      cells[side] = event;
      next.push({ year: Math.min(row.year, event.start), cells });
    }
    flushUntil(rows.length, sorted.length);
    rows = next;
  });
  return rows;
}

type Score = { exact: number; pairs: number; distance: number };
const better = (a: Score, b: Score) =>
  a.exact !== b.exact ? a.exact > b.exact : a.pairs !== b.pairs ? a.pairs > b.pairs : a.distance < b.distance;

/**
 * Order-preserving matching of two sorted lists (like aligning two
 * sequences): the most same-year pairs, then the most pairs, then the least
 * total distance. Same-year first, so two looser pairs never split an exact
 * one. Pairs never cross, so both sides keep their year order. `distance`
 * also hears whether left[i - 1] and right[j - 1] were paired (true at the
 * start of a list). Lists are a few dozen long.
 */
function align(
  n: number,
  m: number,
  distance: (i: number, j: number, leftAbovePaired: boolean, rightAbovePaired: boolean) => number | null,
) {
  // best[i][j][above]: the best score matching left[i..] with right[j..];
  // bit 2 of `above` is set when left[i - 1] was paired, bit 1 for right[j - 1].
  const best: Score[][][] = Array.from({ length: n + 1 }, () =>
    Array.from({ length: m + 1 }, () => Array.from({ length: 4 }, () => ({ exact: 0, pairs: 0, distance: 0 }))),
  );
  const skipLeft = (i: number, j: number, above: number) => best[i + 1][j][above & 1];
  const skipRight = (i: number, j: number, above: number) => best[i][j + 1][above & 2];
  const paired = (i: number, j: number, above: number): Score | null => {
    const d = distance(i, j, i === 0 || (above & 2) !== 0, j === 0 || (above & 1) !== 0);
    if (d === null) return null;
    const rest = best[i + 1][j + 1][3];
    return { exact: rest.exact + (d === 0 ? 1 : 0), pairs: rest.pairs + 1, distance: rest.distance + d };
  };
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      for (let above = 0; above < 4; above++) {
        const left = skipLeft(i, j, above);
        const right = skipRight(i, j, above);
        let score = better(right, left) ? right : left;
        const pair = paired(i, j, above);
        if (pair && !better(score, pair)) score = pair;
        best[i][j][above] = score;
      }
    }
  }

  const pairs: [number, number][] = [];
  let i = 0;
  let j = 0;
  let above = 3;
  while (i < n && j < m) {
    const pair = paired(i, j, above);
    if (pair && !better(best[i][j][above], pair)) {
      pairs.push([i++, j++]);
      above = 3;
    } else if (!better(skipRight(i, j, above), skipLeft(i, j, above))) {
      i++;
      above &= 1;
    } else {
      j++;
      above &= 2;
    }
  }
  return pairs;
}

/** Starting guess of one axis label per this many pixels. */
const TICK_SPACING = 70;
/** Clear space kept between neighbouring axis labels, in pixels. */
const LABEL_GAP = 6;

/**
 * Axis ticks whose centred labels neither touch each other nor run off
 * either end. d3's tick count is only a hint (it rounds to a nice step and
 * can return more than asked), so keep every other tick, then every third,
 * and so on, until the labels fit.
 */
export function fitTicks(
  domain: [number, number],
  width: number,
  labelWidth: (tick: number) => number,
): { tick: number; x: number }[] {
  const x = scaleLinear().domain(domain).range([0, width]);
  const inside = axisTicks(domain, Math.max(2, Math.floor(width / TICK_SPACING)))
    .map((tick) => ({ tick, x: x(tick), half: labelWidth(tick) / 2 }))
    .filter(({ x, half }) => x - half >= 0 && x + half <= width);
  for (let every = 1; every <= inside.length; every++) {
    const kept = inside.filter((_, i) => i % every === 0);
    if (kept.every((t, i) => i === 0 || t.x - t.half >= kept[i - 1].x + kept[i - 1].half + LABEL_GAP)) {
      return kept.map(({ tick, x }) => ({ tick, x }));
    }
  }
  return [];
}
