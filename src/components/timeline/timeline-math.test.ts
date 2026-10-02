import { describe, expect, it } from "vitest";
import type { TimelineCulture } from "./timeline-layout";
import {
  MAX_PX_PER_YEAR,
  MIN_PX_PER_YEAR,
  TICK_EDGE,
  YEAR_STEP_PAGE,
  activeCultures,
  axisTicks,
  tickAnchor,
  barSegments,
  clampYear,
  BAR_HIT_WIDTH,
  MIN_BAR_WIDTH,
  activeBars,
  atLeast,
  clampZoom,
  fitZoom,
  padDomain,
  computeYearDomain,
  takeEcho,
  timelineQuery,
  yearFromParam,
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

  it("starts the first phase after a fuzzy start and ends the last before a fuzzy end, so the fades still show", () => {
    // The Vietnam War's start is 1955 or 1960 and its first phase begins in 1955.
    const phases = [
      { id: "early", start: 1955, end: 1965 },
      { id: "late", start: 1965, end: 1976 },
    ];
    expect(barSegments({ earliestStart: 1955, latestStart: 1960, earliestEnd: 1974, latestEnd: 1976 }, phases)).toEqual([
      { kind: "fade-in", start: 1955, end: 1960 },
      { kind: "phase", start: 1960, end: 1965, phaseId: "early" },
      { kind: "phase", start: 1965, end: 1974, phaseId: "late" },
      { kind: "fade-out", start: 1974, end: 1976 },
    ]);
  });

  it("drops a phase that lies wholly inside a fade", () => {
    const phases = [
      { id: "prelude", start: 1955, end: 1958 },
      { id: "war", start: 1958, end: 1976 },
    ];
    expect(barSegments({ earliestStart: 1955, latestStart: 1960, earliestEnd: 1976, latestEnd: 1976 }, phases)).toEqual([
      { kind: "fade-in", start: 1955, end: 1960 },
      { kind: "phase", start: 1960, end: 1976, phaseId: "war" },
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

describe("tickAnchor", () => {
  // "1850 CE" centred on a tick 2px from the edge loses its first half to the scroll box.
  it("keeps a label near either edge inside the chart", () => {
    expect(tickAnchor(2, 300)).toBe("start");
    expect(tickAnchor(298, 300)).toBe("end");
  });

  it("centres every other label on its tick", () => {
    expect(tickAnchor(TICK_EDGE, 300)).toBe("middle");
    expect(tickAnchor(300 - TICK_EDGE, 300)).toBe("middle");
  });

  it("gives a label 40px, room for half of \"公元前1000年\", before it counts as at the edge", () => {
    expect(TICK_EDGE).toBe(40);
  });
});

describe("?year= echoes", () => {
  // The component's side: a move rewrites the URL, and only a write that changed ?year= is noted.
  function write(unechoed: string[], search: string, year: number) {
    const { query, yearChanged } = timelineQuery(search, year, null);
    return { search: `?${query}`, unechoed: yearChanged ? [...unechoed, String(year)] : unechoed };
  }

  it("ignores its own late URL write while the line is being dragged on", () => {
    let w = write([], "?year=5", 6);
    w = write(w.unechoed, w.search, 7);
    // Next delivers ?year=6 (our replaceState) after the move to 7 has rendered.
    const late = takeEcho(w.unechoed, "6");
    expect(late.echo).toBe(true);
    expect(takeEcho(late.unechoed, "7").echo).toBe(true);
  });

  it("ignores every late echo when the line goes back and forth (6, 7, back to 6)", () => {
    let w = write([], "?year=5", 6);
    w = write(w.unechoed, w.search, 7);
    w = write(w.unechoed, w.search, 6);
    const first = takeEcho(w.unechoed, "6");
    expect(first.echo).toBe(true);
    expect(takeEcho(first.unechoed, "7").echo).toBe(true);
  });

  it("follows a navigation to a new ?year= (a scan from the header)", () => {
    const w = write([], "?year=5", 6);
    const echoed = takeEcho(w.unechoed, "6");
    const scanned = takeEcho(echoed.unechoed, "-1199");
    expect(scanned.echo).toBe(false);
    // A spent echo is gone: a second scan back to 6 is a navigation too.
    expect(takeEcho(scanned.unechoed, "6").echo).toBe(false);
  });

  it("follows a navigation even to a year the line passed through before its echo came back", () => {
    let w = write([], "?year=5", 6);
    w = write(w.unechoed, w.search, 7);
    const coalesced = takeEcho(w.unechoed, "7"); // 6's echo was folded into 7's
    expect(takeEcho(coalesced.unechoed, "6").echo).toBe(false);
  });

  it("follows a navigation to a year it moved through but never wrote (6 and back to 5 in one render)", () => {
    // One effect run for both moves, and ?year= already says 5: the write changes nothing, so nothing echoes.
    const w = write([], "?year=5", 5);
    expect(w.unechoed).toEqual([]);
    expect(takeEcho(w.unechoed, "6").echo).toBe(false);
  });

  it("ignores its own mount write, landing late", () => {
    let w = write([], "", 1);
    w = write(w.unechoed, w.search, 2);
    expect(takeEcho(w.unechoed, "1").echo).toBe(true);
  });
});

describe("timelineQuery", () => {
  it("sets ?year= and ?regions=, keeps other params, and leaves the region commas readable", () => {
    expect(timelineQuery("?year=5&x=1&regions=china", -1199, "china,europe")).toEqual({
      query: "year=-1199&x=1&regions=china,europe",
      yearChanged: true,
    });
  });

  it("drops ?regions= for no filter, and says the year didn't change when ?year= already matches", () => {
    expect(timelineQuery("?year=5&regions=china", 5, null)).toEqual({ query: "year=5", yearChanged: false });
  });
});

describe("yearFromParam", () => {
  const domain: [number, number] = [-3000, 2000];

  it("reads ?year= as an astronomical year, clamped to the domain, or the fallback", () => {
    expect(yearFromParam("-1199", 1, domain)).toBe(-1199);
    expect(yearFromParam("9999", 1, domain)).toBe(2000);
    expect(yearFromParam(null, 1, domain)).toBe(1);
    expect(yearFromParam("nope", 7, domain)).toBe(7);
  });
});

describe("fitting a country's span to the screen", () => {
  it("zooms so the whole domain fills the width", () => {
    expect(fitZoom([0, 1000], 250)).toBe(0.25);
  });

  it("can zoom out further than the world timeline's floor, and never in past its ceiling", () => {
    expect(fitZoom([-2100, 2026], 200)).toBeLessThan(MIN_PX_PER_YEAR);
    expect(fitZoom([1982, 1983], 500)).toBe(MAX_PX_PER_YEAR);
  });

  it("clamps zoom to a floor the caller gives", () => {
    expect(clampZoom(0.01, 0.05)).toBe(0.05);
    expect(clampZoom(100, 0.05)).toBe(MAX_PX_PER_YEAR);
  });

  it("pads the domain so edge bars don't touch the frame, and a one-year span still has room", () => {
    expect(padDomain([-2000, 2000])).toEqual([-2200, 2200]);
    expect(padDomain([1982, 1982])).toEqual([1972, 1992]);
  });
});

describe("atLeast", () => {
  it("widens a narrow bar about its centre", () => {
    expect(atLeast(100, 101, 6)).toEqual({ x: 97.5, width: 6 });
  });

  it("leaves a wide bar alone", () => {
    expect(atLeast(100, 200, 6)).toEqual({ x: 100, width: 100 });
  });

  // A one-year war on a 4,000-year axis is a twentieth of a pixel wide.
  it("keeps every bar visible and a fingertip wide to tap", () => {
    expect(MIN_BAR_WIDTH).toBeGreaterThanOrEqual(4);
    expect(BAR_HIT_WIDTH).toBeGreaterThanOrEqual(32);
  });
});

describe("activeBars", () => {
  const p = (earliestStart: number, latestStart: number, earliestEnd: number, latestEnd: number) => ({
    earliestStart,
    latestStart,
    earliestEnd,
    latestEnd,
    disputed: false,
  });
  const bars = [
    { id: "a", period: p(0, 10, 90, 100) },
    { id: "b", period: p(50, 50, 60, 60) },
    { id: "c", period: p(200, 200, 300, 300) },
  ];

  it("lists the bars alive in a year in their given order, certain inside the solid part", () => {
    expect(activeBars(bars, 55).map(({ bar, certain }) => [bar.id, certain])).toEqual([
      ["a", true],
      ["b", true],
    ]);
    expect(activeBars(bars, 5).map(({ bar, certain }) => [bar.id, certain])).toEqual([["a", false]]);
    expect(activeBars(bars, 150)).toEqual([]);
  });
});
