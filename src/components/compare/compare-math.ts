// Pure logic for the compare screen: how two or three cultures' dates line
// up, and one merged, year-ordered list of their events. No DOM, so it's
// unit-tested directly.

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
    const pairs = align(rows, sorted, (row, event) => {
      const distance = Math.max(...row.cells.map((c) => (c ? Math.abs(c.start - event.start) : 0)));
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

type Score = { pairs: number; distance: number };
const better = (a: Score, b: Score) => a.pairs > b.pairs || (a.pairs === b.pairs && a.distance < b.distance);

/**
 * Order-preserving matching of two sorted lists (like aligning two
 * sequences): the most pairs, then the least total distance. Pairs never
 * cross, so both sides keep their year order. Lists are a few dozen long.
 */
function align<L, R>(left: readonly L[], right: readonly R[], distance: (l: L, r: R) => number | null) {
  const n = left.length;
  const m = right.length;
  // best[i][j]: the best score matching left[i..] with right[j..].
  const best: Score[][] = Array.from({ length: n + 1 }, () =>
    Array.from({ length: m + 1 }, () => ({ pairs: 0, distance: 0 })),
  );
  const paired = (i: number, j: number): Score | null => {
    const d = distance(left[i], right[j]);
    return d === null ? null : { pairs: best[i + 1][j + 1].pairs + 1, distance: best[i + 1][j + 1].distance + d };
  };
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      let score = better(best[i][j + 1], best[i + 1][j]) ? best[i][j + 1] : best[i + 1][j];
      const pair = paired(i, j);
      if (pair && !better(score, pair)) score = pair;
      best[i][j] = score;
    }
  }

  const pairs: [number, number][] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    const pair = paired(i, j);
    if (pair && pair.pairs === best[i][j].pairs && pair.distance === best[i][j].distance) {
      pairs.push([i++, j++]);
    } else if (!better(best[i][j + 1], best[i + 1][j])) i++;
    else j++;
  }
  return pairs;
}
