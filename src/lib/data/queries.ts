import {
  REGIONS,
  type Culture,
  type CultureEvent,
  type Fact,
  type LocalizedText,
  type NativeName,
  type Period,
  type Region,
} from "./schema";

export const MIN_MEANWHILE_CARDS = 4;
export const MAX_MEANWHILE_CARDS = 6;

/**
 * A period's dates and flags without sources or notes: what client
 * components draw, so pages don't ship citations they never render.
 */
export type PeriodSpan = Pick<
  Period,
  "earliestStart" | "latestStart" | "earliestEnd" | "latestEnd" | "default" | "disputed"
>;

export function toPeriodSpan(p: PeriodSpan): PeriodSpan {
  return {
    earliestStart: p.earliestStart,
    latestStart: p.latestStart,
    earliestEnd: p.earliestEnd,
    latestEnd: p.latestEnd,
    default: p.default,
    disputed: p.disputed,
  };
}

/** The light shape pages pass to client components instead of whole cultures. */
export type CultureRef = {
  id: string;
  region: Region;
  name: LocalizedText;
  nativeName?: NativeName;
  period: PeriodSpan;
};

/** The fields the period queries read, so callers can pass a slimmed culture. */
export type CultureCore = Pick<Culture, "id" | "region" | "name" | "nativeName"> & { periods: readonly PeriodSpan[] };

export type ActiveCulture = { culture: CultureRef; certain: boolean };
export type MeanwhileCard = { culture: CultureRef; fact: Fact | null };
export type WorldEvent = { cultureId: string; event: CultureEvent };

type Range = readonly [number, number];

/** Returns the same shape it's given: a full Period from a Culture, a PeriodSpan from a slimmed one. */
export function defaultPeriod<P extends PeriodSpan>(culture: { id: string; periods: readonly P[] }): P {
  const period = culture.periods.find((p) => p.default);
  if (!period) throw new Error(`culture ${culture.id} has no default period`);
  return period;
}

export function toCultureRef(culture: CultureCore): CultureRef {
  return {
    id: culture.id,
    region: culture.region,
    name: culture.name,
    nativeName: culture.nativeName,
    period: toPeriodSpan(defaultPeriod(culture)),
  };
}

const outer = (p: PeriodSpan): Range => [p.earliestStart, p.latestEnd];
const core = (p: PeriodSpan): Range => [p.latestStart, p.earliestEnd];
/** Midpoints of the fuzzy edges: the best single guess at start and end. */
const likely = (p: PeriodSpan): Range => [(p.earliestStart + p.latestStart) / 2, (p.earliestEnd + p.latestEnd) / 2];

const overlap = (a: Range, b: Range) => Math.min(a[1], b[1]) - Math.max(a[0], b[0]);
const contains = (r: Range, year: number) => r[0] <= year && year <= r[1];
const regionRank = (r: Region) => REGIONS.indexOf(r);

/**
 * Cultures alive in a year. "certain" = inside the solid part of the bar;
 * otherwise the year only falls in a fuzzy edge. Certain first, then by
 * region, likely start, id.
 */
export function activeAt(cultures: readonly CultureCore[], year: number): ActiveCulture[] {
  return cultures
    .map((c) => ({ c, p: defaultPeriod(c) }))
    .filter(({ p }) => contains(outer(p), year))
    .map(({ c, p }) => ({ ref: toCultureRef(c), certain: contains(core(p), year), start: likely(p)[0] }))
    .sort(
      (a, b) =>
        Number(b.certain) - Number(a.certain) ||
        regionRank(a.ref.region) - regionRank(b.ref.region) ||
        a.start - b.start ||
        a.ref.id.localeCompare(b.ref.id),
    )
    .map(({ ref, certain }) => ({ culture: ref, certain }));
}

type Candidate = { culture: Culture; score: number };

/**
 * Other cultures alive during the anchor's default period, spread across
 * regions: take the best from each region in turn (regions ordered by their
 * best overlap, the anchor's own region last). Cultures whose likely ranges
 * overlap come first; ones that only touch at the fuzzy edges are used only to
 * reach MIN_MEANWHILE_CARDS.
 */
export function meanwhile(anchor: Culture, cultures: readonly Culture[]): MeanwhileCard[] {
  const anchorPeriod = defaultPeriod(anchor);
  const primary: Candidate[] = [];
  const fuzzy: Candidate[] = [];
  for (const c of cultures) {
    if (c.id === anchor.id) continue;
    const p = defaultPeriod(c);
    const likelyOverlap = overlap(likely(anchorPeriod), likely(p));
    if (likelyOverlap > 0) primary.push({ culture: c, score: likelyOverlap });
    else if (overlap(outer(anchorPeriod), outer(p)) >= 0) {
      fuzzy.push({ culture: c, score: overlap(outer(anchorPeriod), outer(p)) });
    }
  }

  const picked = roundRobin(primary, anchor.region).slice(0, MAX_MEANWHILE_CARDS);
  if (picked.length < MIN_MEANWHILE_CARDS) {
    picked.push(...roundRobin(fuzzy, anchor.region).slice(0, MIN_MEANWHILE_CARDS - picked.length));
  }

  return picked.map((c) => {
    const window: Range = [
      Math.max(anchorPeriod.earliestStart, defaultPeriod(c).earliestStart),
      Math.min(anchorPeriod.latestEnd, defaultPeriod(c).latestEnd),
    ];
    return { culture: toCultureRef(c), fact: bestFact(c.facts, window) };
  });
}

function roundRobin(candidates: Candidate[], anchorRegion: Region): Culture[] {
  const groups = REGIONS.map((region) => ({
    region,
    list: candidates
      .filter((c) => c.culture.region === region)
      .sort((a, b) => b.score - a.score || a.culture.id.localeCompare(b.culture.id)),
  }))
    .filter((g) => g.list.length > 0)
    .sort(
      (a, b) =>
        Number(a.region === anchorRegion) - Number(b.region === anchorRegion) ||
        b.list[0].score - a.list[0].score ||
        regionRank(a.region) - regionRank(b.region),
    );

  const out: Culture[] = [];
  for (let round = 0; out.length < candidates.length; round++) {
    for (const { list } of groups) {
      if (list[round]) out.push(list[round].culture);
    }
  }
  return out;
}

function bestFact(facts: readonly Fact[], window: Range): Fact | null {
  let best: { fact: Fact; score: number } | null = null;
  for (const fact of facts) {
    const score = overlap([fact.start, fact.end], window);
    if (score < 0) continue;
    if (!best || score > best.score || (score === best.score && fact.id < best.fact.id)) {
      best = { fact, score };
    }
  }
  return best?.fact ?? null;
}

/** Events worldwide whose year (or range) overlaps [from, to], inclusive, in year order. */
export function eventsBetween(cultures: readonly Culture[], from: number, to: number): WorldEvent[] {
  return cultures
    .flatMap((c) => c.events.map((event) => ({ cultureId: c.id, event })))
    .filter(({ event }) => overlap([event.start, event.end ?? event.start], [from, to]) >= 0)
    .sort(
      (a, b) =>
        a.event.start - b.event.start ||
        a.cultureId.localeCompare(b.cultureId) ||
        a.event.id.localeCompare(b.event.id),
    );
}

/** For each of a culture's events: the other cultures alive in that event's year. */
export type EventWorld = Record<string, ActiveCulture[]>;

export function eventWorld(culture: Culture, cultures: readonly Culture[]): EventWorld {
  return Object.fromEntries(
    culture.events.map((e) => [e.id, activeAt(cultures, e.start).filter((a) => a.culture.id !== culture.id)]),
  );
}
