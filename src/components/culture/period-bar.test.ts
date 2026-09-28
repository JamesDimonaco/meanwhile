import { describe, expect, it } from "vitest";
import type { Period } from "@/lib/data/schema";
import { periodBarSegments } from "./period-bar";

function period(overrides: Partial<Period>): Period {
  return {
    id: "p",
    earliestStart: -1600,
    latestStart: -1500,
    earliestEnd: -1050,
    latestEnd: -1045,
    sources: [{ citation: "x" }],
    default: true,
    disputed: false,
    ...overrides,
  };
}

describe("periodBarSegments", () => {
  it("splits into fade-in, solid and fade-out proportional to each span", () => {
    // earliestStart -1600, latestStart -1500 (span 100), earliestEnd -1050
    // (span 450), latestEnd -1045 (span 5), total 555.
    const segments = periodBarSegments(period({}));
    expect(segments.preFade).toBeCloseTo((100 / 555) * 100);
    expect(segments.solid).toBeCloseTo((450 / 555) * 100);
    expect(segments.postFade).toBeCloseTo((5 / 555) * 100);
  });

  it("always sums to 100 (no gap or overlap in the bar)", () => {
    const segments = periodBarSegments(period({}));
    expect(segments.preFade + segments.solid + segments.postFade).toBeCloseTo(100);
  });

  it("is fully solid when there are no fuzzy edges at all", () => {
    const segments = periodBarSegments(
      period({ earliestStart: -1199, latestStart: -1199, earliestEnd: -1050, latestEnd: -1050 }),
    );
    expect(segments).toEqual({ preFade: 0, solid: 100, postFade: 0 });
  });

  it("never produces a negative width even if data has start > end for a span", () => {
    // Schema validation should already reject this, but the bar math must not
    // render a negative-width segment if it ever slips through.
    const segments = periodBarSegments(period({ latestStart: -1620 })); // before earliestStart
    expect(segments.preFade).toBeGreaterThanOrEqual(0);
  });
});
