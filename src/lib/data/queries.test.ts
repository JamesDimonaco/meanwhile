import { describe, expect, it } from "vitest";
import {
  MAX_MEANWHILE_CARDS,
  MIN_MEANWHILE_CARDS,
  activeAt,
  eventsBetween,
  meanwhile,
  meanwhileAtYear,
  meanwhileCandidates,
  pickMeanwhile,
  successionFor,
} from "./queries";
import type { Culture, CultureEvent, Fact, Region } from "./schema";

const src = { citation: "Test source" };

function culture(
  id: string,
  region: Region,
  [earliestStart, latestStart, earliestEnd, latestEnd]: [number, number, number, number],
  extra: { facts?: Fact[]; events?: CultureEvent[] } = {},
): Culture {
  return {
    id,
    region,
    wikidataId: "Q1",
    name: { en: id },
    aliases: [],
    description: { en: id },
    reviewed: { es: false, zh: false },
    periods: [
      { id: "main", earliestStart, latestStart, earliestEnd, latestEnd, sources: [src], default: true, disputed: false },
    ],
    phases: [],
    events: extra.events ?? [],
    facts: extra.facts ?? [],
  };
}

function fact(id: string, start: number, end: number): Fact {
  return { id, text: { en: id }, start, end, sources: [src], disputed: false };
}

function event(id: string, start: number, end?: number): CultureEvent {
  return { id, start, end, type: "founding", title: { en: id }, sources: [src, src], disputed: false };
}

const ids = (xs: { culture: { id: string } }[]) => xs.map((x) => x.culture.id);

describe("card count constants", () => {
  it("shows between 4 and 6 meanwhile cards", () => {
    expect(MIN_MEANWHILE_CARDS).toBe(4);
    expect(MAX_MEANWHILE_CARDS).toBe(6);
  });
});

describe("activeAt", () => {
  const cultures = [
    culture("core", "europe", [-1000, -900, -500, -400]),
    culture("edge", "china", [-1000, -900, -500, -400]),
    culture("gone", "europe", [-3000, -2900, -2000, -1900]),
    culture("early", "china", [-800, -700, -300, -200]),
  ];

  it("marks a year inside the solid part as certain and a fuzzy edge as possible", () => {
    const at = activeAt(cultures, -950);
    expect(at.map((a) => [a.culture.id, a.certain])).toEqual([
      ["edge", false],
      ["core", false],
    ]);
    const mid = activeAt(cultures, -600);
    expect(mid.map((a) => [a.culture.id, a.certain])).toEqual([
      ["edge", true],
      ["early", true],
      ["core", true],
    ]);
  });

  it("includes the outermost fuzzy bounds and nothing beyond", () => {
    expect(ids(activeAt(cultures, -1000))).toContain("core");
    expect(ids(activeAt(cultures, -1001))).not.toContain("core");
    expect(ids(activeAt(cultures, -400))).toContain("core");
    expect(ids(activeAt(cultures, -399))).not.toContain("core");
  });

  it("lists certain cultures before possible ones", () => {
    // At -450: "core"/"edge" only possibly (earliestEnd -500), "early" certainly.
    expect(activeAt(cultures, -450).map((a) => a.culture.id)).toEqual(["early", "edge", "core"]);
  });
});

describe("meanwhile", () => {
  const anchor = culture("anchor", "china", [-1600, -1550, -1050, -1000]);

  it("never includes the anchor itself", () => {
    const result = meanwhile(anchor, [anchor, culture("other", "europe", [-1500, -1450, -1100, -1050])]);
    expect(ids(result)).toEqual(["other"]);
  });

  it("caps the list at 6 cards", () => {
    const many = Array.from({ length: 10 }, (_, i) =>
      culture(`c${i}`, (["europe", "mesoamerica", "south-america"] as const)[i % 3], [-1500, -1450, -1100, -1050]),
    );
    expect(meanwhile(anchor, many)).toHaveLength(6);
  });

  it("spreads cards across regions before repeating one, anchor's own region last", () => {
    const cultures = [
      culture("china-a", "china", [-1600, -1550, -1050, -1000]),
      culture("europe-a", "europe", [-1600, -1550, -1050, -1000]),
      culture("europe-b", "europe", [-1590, -1540, -1060, -1010]),
      culture("europe-c", "europe", [-1580, -1530, -1070, -1020]),
      culture("meso-a", "mesoamerica", [-1300, -1250, -1150, -1100]),
      culture("sa-a", "south-america", [-1400, -1350, -1150, -1100]),
    ];
    // Region order follows each region's best overlap: europe, south-america, mesoamerica, then china.
    expect(ids(meanwhile(anchor, cultures))).toEqual([
      "europe-a",
      "sa-a",
      "meso-a",
      "china-a",
      "europe-b",
      "europe-c",
    ]);
  });

  it("is deterministic regardless of input order", () => {
    const cultures = [
      culture("b", "europe", [-1500, -1450, -1100, -1050]),
      culture("a", "europe", [-1500, -1450, -1100, -1050]),
      culture("c", "mesoamerica", [-1500, -1450, -1100, -1050]),
    ];
    const forward = ids(meanwhile(anchor, cultures));
    expect(ids(meanwhile(anchor, [...cultures].reverse()))).toEqual(forward);
    // Equal overlaps fall back to the fixed REGIONS order, then id.
    expect(forward).toEqual(["c", "a", "b"]);
  });

  it("tops up to the minimum with cultures that only touch at the fuzzy edges", () => {
    const solid = [
      culture("s1", "europe", [-1500, -1450, -1100, -1050]),
      culture("s2", "mesoamerica", [-1400, -1350, -1100, -1050]),
    ];
    // Likely ranges do not overlap the anchor's (-1575..-1025); outer ranges do.
    const fuzzy = [
      culture("f1", "south-america", [-1040, -900, -800, -700]),
      culture("f2", "europe", [-1030, -900, -800, -700]),
      culture("f3", "europe", [-1020, -900, -800, -700]),
    ];
    expect(ids(meanwhile(anchor, [...solid, ...fuzzy]))).toEqual(["s1", "s2", "f1", "f2"]);
  });

  it("does not add fuzzy-only overlaps once the minimum is met", () => {
    const solid = ["europe", "mesoamerica", "south-america", "europe"].map((r, i) =>
      culture(`s${i}`, r as Region, [-1500, -1450, -1100, -1050]),
    );
    const fuzzy = culture("f1", "south-america", [-1040, -900, -800, -700]);
    expect(ids(meanwhile(anchor, [...solid, fuzzy]))).not.toContain("f1");
  });

  it("excludes cultures with no overlap at all", () => {
    expect(meanwhile(anchor, [culture("later", "europe", [-900, -850, -500, -400])])).toEqual([]);
  });

  it("picks the fact that best overlaps the shared window, or none", () => {
    const other = culture("other", "europe", [-1500, -1450, -1100, -1050], {
      facts: [fact("too-late", -900, -800), fact("partial", -1100, -950), fact("inside", -1300, -1200)],
    });
    expect(meanwhile(anchor, [other])[0].fact?.id).toBe("inside");

    const noFact = culture("nofact", "europe", [-1500, -1450, -1100, -1050], {
      facts: [fact("too-late", -900, -800)],
    });
    expect(meanwhile(anchor, [noFact])[0].fact).toBeNull();
  });

  it("re-picks from a region-filtered pool exactly as if only those regions existed", () => {
    const cultures = [
      culture("china-a", "china", [-1600, -1550, -1050, -1000]),
      culture("europe-a", "europe", [-1600, -1550, -1050, -1000]),
      culture("europe-b", "europe", [-1590, -1540, -1060, -1010]),
      culture("meso-a", "mesoamerica", [-1300, -1250, -1150, -1100]),
      culture("sa-a", "south-america", [-1400, -1350, -1150, -1100]),
      culture("sa-b", "south-america", [-1450, -1400, -1150, -1100]),
      // Fuzzy-only: never needed unfiltered, but needed to reach the minimum once filtered.
      culture("europe-f1", "europe", [-1040, -900, -800, -700]),
      culture("europe-f2", "europe", [-1030, -900, -800, -700]),
      culture("sa-f1", "south-america", [-1040, -900, -800, -700]),
    ];
    const { candidates } = meanwhileCandidates(anchor, cultures);
    for (const regions of [["europe"], ["china", "mesoamerica"], ["south-america", "europe"]] as Region[][]) {
      const inRegions = <T extends { region: Region }>(xs: readonly T[]) => xs.filter((x) => regions.includes(x.region));
      expect(pickMeanwhile(inRegions(candidates), anchor.region)).toEqual(ids(meanwhile(anchor, inRegions(cultures))));
    }
    expect(pickMeanwhile(candidates, anchor.region)).toEqual(ids(meanwhile(anchor, cultures)));
  });
});

describe("meanwhileAtYear (a war's start year)", () => {
  const cultures = [
    culture("aztec", "mesoamerica", [1325, 1325, 1521, 1521], { facts: [fact("aztec-fact", 1400, 1500)] }),
    culture("inca", "south-america", [1400, 1438, 1532, 1572], { facts: [fact("old", 1440, 1450), fact("now", 1500, 1530)] }),
    culture("ming", "china", [1368, 1368, 1644, 1644]),
    culture("edge", "europe", [1500, 1530, 1600, 1600]),
    culture("gone", "europe", [800, 800, 900, 900]),
  ];

  it("offers the cultures alive that year, minus the war's own, with the fact that covers the year", () => {
    const { candidates, cards } = meanwhileAtYear(1519, cultures, ["aztec"]);
    expect(candidates.map((c) => [c.id, c.fuzzy])).toEqual([
      ["inca", false],
      ["ming", false],
      ["edge", true],
    ]);
    expect(cards.inca.fact?.id).toBe("now");
    expect(cards.ming.fact).toBeNull();
  });

  it("ranks by how far inside its dates each culture is, and picks without an anchor region when the war has none", () => {
    const { candidates } = meanwhileAtYear(1519, cultures, []);
    // Ming is 125 years from either edge, the Inca 13, the Aztec Empire 2; edge only touches the fuzzy start.
    expect(pickMeanwhile(candidates, null)).toEqual(["ming", "inca", "aztec", "edge"]);
  });

  it("offers nothing in a year no culture covers", () => {
    expect(meanwhileAtYear(2000, cultures, []).candidates).toEqual([]);
  });
});

describe("eventsBetween", () => {
  const cultures = [
    culture("x", "europe", [-2000, -1900, 0, 100], { events: [event("x2", -500), event("x1", -1200, -1100)] }),
    culture("y", "china", [-2000, -1900, 0, 100], { events: [event("y1", -1199), event("y2", -1000)] }),
  ];

  it("returns events overlapping the window worldwide, in year order", () => {
    const found = eventsBetween(cultures, -1199, -1150).map((e) => `${e.cultureId}/${e.event.id}`);
    expect(found).toEqual(["x/x1", "y/y1"]);
  });

  it("treats window bounds as inclusive", () => {
    expect(eventsBetween(cultures, -1000, -1000).map((e) => e.event.id)).toEqual(["y2"]);
    expect(eventsBetween(cultures, -999, -501)).toEqual([]);
  });
});

describe("successionFor", () => {
  const place = (en: string) => ({ en, es: en, zh: en });
  const link = (from: string, to: string, where: string, note?: string) => ({
    from,
    to,
    place: place(where),
    sources: [src],
    note: note === undefined ? undefined : { en: note },
  });
  const links = [
    link("teotihuacan", "toltec", "central Mexico", "gap"),
    link("toltec", "aztec", "central Mexico"),
    link("tula-rival", "toltec", "Hidalgo"),
    link("maya", "other", "Yucatan", "unrelated"),
  ];

  it("puts what came before and after a culture on one line per place", () => {
    expect(successionFor("toltec", links)).toEqual([
      { place: place("central Mexico"), before: ["teotihuacan"], after: ["aztec"], notes: [{ en: "gap" }] },
      { place: place("Hidalgo"), before: ["tula-rival"], after: [], notes: [] },
    ]);
  });

  it("is empty for a culture with no links", () => {
    expect(successionFor("inca", links)).toEqual([]);
  });
});
