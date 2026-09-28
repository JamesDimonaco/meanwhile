import { describe, expect, it } from "vitest";
import {
  MAX_PX_PER_YEAR,
  MIN_PX_PER_YEAR,
  YEAR_STEP_PAGE,
  barSegments,
  clampYear,
  clampZoom,
  computeYearDomain,
  yearStepForKey,
} from "./timeline-math";

describe("barSegments", () => {
  const period = { earliestStart: -1599, latestStart: -1499, earliestEnd: -1049, latestEnd: -1045 };

  it("fades both edges around one solid middle when there are no phases", () => {
    expect(barSegments(period, [])).toEqual([
      { kind: "fade-in", start: -1599, end: -1499 },
      { kind: "solid", start: -1499, end: -1049 },
      { kind: "fade-out", start: -1049, end: -1045 },
    ]);
  });

  it("drops a fade segment when that edge has no fuzziness", () => {
    const sharp = { earliestStart: -500, latestStart: -500, earliestEnd: -100, latestEnd: -50 };
    expect(barSegments(sharp, [])).toEqual([
      { kind: "solid", start: -500, end: -100 },
      { kind: "fade-out", start: -100, end: -50 },
    ]);
  });

  it("drops the solid segment when the fuzzy start/end windows overlap (no gap between them)", () => {
    const overlapping = { earliestStart: -200, latestStart: -80, earliestEnd: -120, latestEnd: -40 };
    expect(barSegments(overlapping, [])).toEqual([
      { kind: "fade-in", start: -200, end: -80 },
      { kind: "fade-out", start: -120, end: -40 },
    ]);
  });

  it("replaces the solid middle with one segment per phase, keeping the period's own fuzzy edges (Rome)", () => {
    const phases = [
      { id: "kingdom", start: -753, end: -509 },
      { id: "republic", start: -509, end: -27 },
      { id: "empire", start: -27, end: 476 },
    ];
    expect(barSegments({ earliestStart: -753, latestStart: -753, earliestEnd: 476, latestEnd: 476 }, phases)).toEqual([
      { kind: "phase", start: -753, end: -509, phaseId: "kingdom" },
      { kind: "phase", start: -509, end: -27, phaseId: "republic" },
      { kind: "phase", start: -27, end: 476, phaseId: "empire" },
    ]);
  });
});

describe("computeYearDomain", () => {
  it("spans the earliest start to the latest end across every range", () => {
    expect(
      computeYearDomain([
        { earliestStart: -1599, latestEnd: -1045 },
        { earliestStart: -3600, latestEnd: -1400 },
      ]),
    ).toEqual([-3600, -1045]);
  });

  it("falls back to a non-empty domain when there is nothing to show", () => {
    const [min, max] = computeYearDomain([]);
    expect(max).toBeGreaterThan(min);
  });
});

describe("yearStepForKey", () => {
  it("steps by exactly one year for the arrow keys", () => {
    expect(yearStepForKey("ArrowRight")).toBe(1);
    expect(yearStepForKey("ArrowUp")).toBe(1);
    expect(yearStepForKey("ArrowLeft")).toBe(-1);
    expect(yearStepForKey("ArrowDown")).toBe(-1);
  });

  it("pages by the pinned page-step constant, not a hardcoded number", () => {
    expect(yearStepForKey("PageUp")).toBe(YEAR_STEP_PAGE);
    expect(yearStepForKey("PageDown")).toBe(-YEAR_STEP_PAGE);
    expect(YEAR_STEP_PAGE).toBe(10);
  });

  it("returns null for keys it doesn't handle, so the caller ignores them", () => {
    expect(yearStepForKey("Tab")).toBeNull();
    expect(yearStepForKey("a")).toBeNull();
  });
});

describe("clampYear", () => {
  it("clamps into the domain and rounds to a whole year", () => {
    expect(clampYear(5.6, [-1000, 1000])).toBe(6);
    expect(clampYear(-2000, [-1000, 1000])).toBe(-1000);
    expect(clampYear(5000, [-1000, 1000])).toBe(1000);
  });
});

describe("clampZoom", () => {
  it("keeps pixels-per-year inside the pinned min/max", () => {
    expect(clampZoom(0)).toBe(MIN_PX_PER_YEAR);
    expect(clampZoom(1000)).toBe(MAX_PX_PER_YEAR);
    expect(clampZoom(2)).toBe(2);
  });

  it("pins the exact bounds so a silent change is caught", () => {
    expect(MIN_PX_PER_YEAR).toBe(0.15);
    expect(MAX_PX_PER_YEAR).toBe(12);
  });
});
