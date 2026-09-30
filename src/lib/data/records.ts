import { likelyRange, type PeriodSpan } from "./queries";

export const RECORD_KINDS = ["oldest", "newest", "longest"] as const;
export type RecordKind = (typeof RECORD_KINDS)[number];
export type CardBadge = "oldest" | "longest";

/** Anything with an id and its default period, e.g. a CultureRef. */
type Dated = { id: string; period: PeriodSpan };

export function likelySpan(period: PeriodSpan): { start: number; end: number; duration: number } {
  const [start, end] = likelyRange(period);
  return { start, end, duration: end - start };
}

/** Higher score wins. */
const SCORE: Record<RecordKind, (p: PeriodSpan) => number> = {
  oldest: (p) => -likelySpan(p).start,
  newest: (p) => likelySpan(p).start,
  longest: (p) => likelySpan(p).duration,
};

/** The record holder; ties go to the alphabetically first id. */
export function recordHolder<T extends Dated>(kind: RecordKind, items: readonly T[]): T {
  if (items.length === 0) throw new Error("recordHolder needs at least one item");
  const score = SCORE[kind];
  return items.reduce((best, x) => {
    const diff = score(x.period) - score(best.period);
    return diff > 0 || (diff === 0 && x.id < best.id) ? x : best;
  });
}

/** All-time records held by one culture, in RECORD_KINDS order. */
export function recordsHeld(id: string, all: readonly Dated[]): RecordKind[] {
  if (all.length === 0) return [];
  return RECORD_KINDS.filter((kind) => recordHolder(kind, all).id === id);
}

/** "Oldest here" / "longest-lasting here" among the cards shown; one badge per card at most. */
export function cardBadges(cards: readonly Dated[]): Partial<Record<string, CardBadge>> {
  if (cards.length === 0) return {};
  const oldest = recordHolder("oldest", cards).id;
  const longest = recordHolder("longest", cards).id;
  return longest === oldest ? { [oldest]: "oldest" } : { [oldest]: "oldest", [longest]: "longest" };
}
