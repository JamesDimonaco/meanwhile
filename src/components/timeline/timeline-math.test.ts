import { describe, expect, it } from "vitest";
import type { TimelineCulture } from "./timeline-layout";
import {
  MAX_PX_PER_YEAR,
  MIN_PX_PER_YEAR,
  YEAR_STEP_PAGE,
  activeCultures,
  axisTicks,
  barSegments,
  clampYear,
  clampZoom,
  computeYearDomain,
  followYearParam,
  initialYearState,
  moveYearState,
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

function timelineCulture(id: string, region: TimelineCulture["region"], period: TimelineCulture["period"]): TimelineCulture {
  return { id, region, name: id, period, phases: [], events: [] };
}

describe("activeCultures", () => {
  const shang = timelineCulture("shang", "china", {
    earliestStart: -1600,
    latestStart: -1500,
    earliestEnd: -1050,
    latestEnd: -1040,
    disputed: false,
  });
  const inca = timelineCulture("inca", "south-america", {
    earliestStart: 1200,
    latestStart: 1200,
    earliestEnd: 1533,
    latestEnd: 1533,
    disputed: false,
  });

  it("includes a culture only when the year falls in its outer (fuzzy-inclusive) range", () => {
    expect(activeCultures([shang, inca], -1300).map((a) => a.culture.id)).toEqual(["shang"]);
    expect(activeCultures([shang, inca], 1300).map((a) => a.culture.id)).toEqual(["inca"]);
    expect(activeCultures([shang, inca], 0)).toEqual([]);
  });

  it("marks certain=true only inside the solid (latestStart..earliestEnd) part of the bar", () => {
    expect(activeCultures([shang], -1300)[0].certain).toBe(true); // inside -1500..-1050
    expect(activeCultures([shang], -1550)[0].certain).toBe(false); // in the fuzzy start edge
  });

  it("sorts by region order (china before south-america) when both are equally certain", () => {
    const incaContemporary = timelineCulture("inca-contemporary", "south-america", shang.period);
    const results = activeCultures([incaContemporary, shang], -1300);
    expect(results.map((a) => a.culture.id)).toEqual(["shang", "inca-contemporary"]);
  });

  it("sorts certain cultures before uncertain ones within the same region, ahead of id order", () => {
    // "a-uncertain" sorts first alphabetically, but only in its fuzzy edge at -1300.
    const uncertain = timelineCulture("a-uncertain", "china", {
      earliestStart: -1600,
      latestStart: -1250,
      earliestEnd: -1200,
      latestEnd: -1000,
      disputed: false,
    });
    const results = activeCultures([uncertain, shang], -1300);
    expect(results.map((a) => a.culture.id)).toEqual(["shang", "a-uncertain"]);
    expect(results.map((a) => a.certain)).toEqual([true, false]);
  });

  it("orders by likely start, as the culture pages' activeAt does, not by the middle of the whole span", () => {
    // long starts earlier but, running to 1500, has the later midpoint.
    const long = timelineCulture("long", "china", {
      earliestStart: -500,
      latestStart: -500,
      earliestEnd: 1500,
      latestEnd: 1500,
      disputed: false,
    });
    const short = timelineCulture("short", "china", {
      earliestStart: -300,
      latestStart: -300,
      earliestEnd: -100,
      latestEnd: -100,
      disputed: false,
    });
    expect(activeCultures([short, long], -200).map((a) => a.culture.id)).toEqual(["long", "short"]);
  });
});

describe("axisTicks", () => {
  it("puts ticks on round displayed years, so the -1000 gridline reads 1000 BCE, not 1001 BCE", () => {
    // astronomical -999 = 1000 BCE; there is no year 0 on screen, so the tick there is 1 CE.
    expect(axisTicks([-1200, 200], 7)).toEqual([-1199, -999, -799, -599, -399, -199, 1, 200]);
  });

  it("leaves CE ticks untouched", () => {
    expect(axisTicks([1000, 1900], 4)).toEqual([1000, 1200, 1400, 1600, 1800]);
  });

  it("never returns a tick outside the domain", () => {
    for (const t of axisTicks([-4099, 1912], 40)) {
      expect(t).toBeGreaterThanOrEqual(-4099);
      expect(t).toBeLessThanOrEqual(1912);
    }
  });
});

describe("year state and ?year=", () => {
  const domain: [number, number] = [-3000, 2000];

  it("ignores its own late URL write while the line is being dragged on", () => {
    let s = initialYearState("5", 1, domain);
    s = moveYearState(s, 6);
    s = moveYearState(s, 7);
    // Next delivers ?year=6 (our replaceState) after the move to 7 has rendered.
    s = followYearParam(s, "6", domain);
    expect(s.year).toBe(7);
    s = followYearParam(s, "7", domain);
    expect(s.year).toBe(7);
  });

  it("ignores every late echo when the line goes back and forth (6, 7, back to 6)", () => {
    let s = initialYearState("5", 1, domain);
    s = moveYearState(s, 6);
    s = moveYearState(s, 7);
    s = moveYearState(s, 6);
    s = followYearParam(s, "6", domain); // the first write's echo
    s = followYearParam(s, "7", domain);
    expect(s.year).toBe(6);
  });

  it("follows a navigation to a new ?year= (a scan from the header)", () => {
    let s = initialYearState("5", 1, domain);
    s = moveYearState(s, 6);
    s = followYearParam(s, "6", domain);
    s = followYearParam(s, "-1199", domain);
    expect(s.year).toBe(-1199);
  });

  it("follows a navigation even to a year the line passed through before its echo came back", () => {
    let s = initialYearState("5", 1, domain);
    s = moveYearState(s, 6);
    s = moveYearState(s, 7);
    s = followYearParam(s, "7", domain); // 6's echo was coalesced into 7's
    s = followYearParam(s, "6", domain);
    expect(s.year).toBe(6);
  });

  it("starts from ?year=, clamped, or the fallback, and ignores its own mount write", () => {
    expect(initialYearState("-1199", 1, domain).year).toBe(-1199);
    expect(initialYearState("9999", 1, domain).year).toBe(2000);
    let s = initialYearState(null, 1, domain);
    expect(s.year).toBe(1);
    s = moveYearState(s, 2);
    s = followYearParam(s, "1", domain); // the mount write, landing late
    expect(s.year).toBe(2);
  });
});
