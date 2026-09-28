import { describe, expect, it } from "vitest";
import { cardBadges, likelySpan, recordHolder, recordsHeld } from "./records";
import { toCultureRef, type CultureCore } from "./queries";
import type { Period } from "./schema";

const src = { citation: "Test source" };

function period(
  [earliestStart, latestStart, earliestEnd, latestEnd]: [number, number, number, number],
  extra: Partial<Period> = {},
): Period {
  return { id: "main", earliestStart, latestStart, earliestEnd, latestEnd, sources: [src], default: true, disputed: false, ...extra };
}

function culture(id: string, edges: [number, number, number, number], extra: Partial<Period> = {}) {
  return { id, period: period(edges, extra) };
}

describe("likelySpan", () => {
  it("runs from the midpoint of the start edge to the midpoint of the end edge", () => {
    expect(likelySpan(period([-1000, -800, 100, 300]))).toEqual({ start: -900, end: 200, duration: 1100 });
  });
});

describe("recordHolder", () => {
  // earliestStart alone would pick "wide", latestStart alone would pick "sharp";
  // only the midpoint of the start edge picks "middle".
  const starts = [
    culture("wide", [-1000, 0, 500, 500]), // mid -500
    culture("sharp", [-600, -600, 500, 500]), // mid -600
    culture("middle", [-900, -400, 500, 500]), // mid -650
  ];

  it("oldest = earliest midpoint of the start edge", () => {
    expect(recordHolder("oldest", starts).id).toBe("middle");
  });

  it("newest = latest midpoint of the start edge", () => {
    // earliestStart alone would pick "sharp" (-600), latestStart alone "wide" (0);
    // midpoints: wide -500, sharp -600, middle -650, late -450.
    const late = culture("late", [-800, -100, 500, 500]);
    expect(recordHolder("newest", [...starts, late]).id).toBe("late");
  });

  it("longest-lasting = longest span between the two edge midpoints", () => {
    // The outer span would pick "fuzzy", the solid core "solid"; only the
    // edge midpoints pick "middle".
    const spans = [
      culture("fuzzy", [-1000, 0, 0, 1000]), // outer 2000, core 0, likely 1000
      culture("solid", [-500, -500, 500, 500]), // outer 1000, core 1000, likely 1000
      culture("middle", [-800, -300, 300, 800]), // outer 1600, core 600, likely 1100
    ];
    expect(recordHolder("longest", spans).id).toBe("middle");
  });

  it("reads the default period, not the first one, once passed through toCultureRef", () => {
    const c: CultureCore = {
      id: "two",
      region: "europe",
      name: { en: "two" },
      periods: [
        period([-9000, -9000, -8000, -8000], { id: "alt", default: false }),
        period([100, 100, 200, 200]),
      ],
    };
    expect(recordHolder("oldest", [toCultureRef(c), culture("other", [0, 0, 50, 50])]).id).toBe("other");
  });

  it("breaks ties by id, whatever the input order", () => {
    const a = culture("alpha", [-500, -500, 0, 0]);
    const b = culture("beta", [-500, -500, 0, 0]);
    for (const kind of ["oldest", "newest", "longest"] as const) {
      expect(recordHolder(kind, [b, a]).id).toBe("alpha");
      expect(recordHolder(kind, [a, b]).id).toBe("alpha");
    }
  });

  it("counts disputed periods", () => {
    const disputed = culture("disputed", [-5000, -5000, 0, 0], { disputed: true });
    expect(recordHolder("oldest", [culture("plain", [-100, -100, 0, 0]), disputed]).id).toBe("disputed");
  });
});

describe("recordsHeld", () => {
  const all = [
    culture("old", [-3000, -3000, -2900, -2900]),
    culture("long", [-2000, -2000, 1000, 1000]),
    culture("new", [1500, 1500, 1600, 1600]),
    culture("plain", [0, 0, 100, 100]),
  ];

  it("lists the all-time records a culture holds, in a fixed order", () => {
    expect(recordsHeld("old", all)).toEqual(["oldest"]);
    expect(recordsHeld("long", all)).toEqual(["longest"]);
    expect(recordsHeld("new", all)).toEqual(["newest"]);
    expect(recordsHeld("plain", all)).toEqual([]);
    expect(recordsHeld("old", [all[0], culture("x", [-100, -100, 0, 0])])).toEqual(["oldest", "longest"]);
  });
});

describe("cardBadges", () => {
  const cards = [
    culture("a", [-500, -500, 0, 0]),
    culture("b", [-800, -800, -700, -700]),
    culture("c", [-600, -600, 800, 800]),
  ];

  it("badges the oldest and the longest-lasting card among those shown", () => {
    expect(cardBadges(cards)).toEqual({ b: "oldest", c: "longest" });
  });

  it("never gives one card two badges: oldest wins", () => {
    expect(cardBadges([cards[0], culture("d", [-900, -900, 900, 900])])).toEqual({ d: "oldest" });
  });

  it("gives no badges for no cards", () => {
    expect(cardBadges([])).toEqual({});
  });
});
