import type { Period } from "@/lib/data/schema";

/** Widths (0–100) for the fade-in, solid and fade-out segments of a period's bar. */
export type PeriodBarSegments = { preFade: number; solid: number; postFade: number };

/**
 * Solid from latestStart to earliestEnd, fading across each fuzzy edge.
 * Degenerates to a fully solid bar when a period has no fuzzy edges
 * (earliestStart === latestStart and earliestEnd === latestEnd).
 */
export function periodBarSegments(period: Period): PeriodBarSegments {
  const total = period.latestEnd - period.earliestStart;
  if (total <= 0) return { preFade: 0, solid: 100, postFade: 0 };

  const pct = (span: number) => (Math.max(0, span) / total) * 100;
  return {
    preFade: pct(period.latestStart - period.earliestStart),
    solid: pct(period.earliestEnd - period.latestStart),
    postFade: pct(period.latestEnd - period.earliestEnd),
  };
}
