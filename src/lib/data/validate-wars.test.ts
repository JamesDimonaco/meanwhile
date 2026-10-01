import { describe, expect, it } from "vitest";
import { validateDataset, type DataFile } from "./validate";
import { REVIEWED, SENSITIVE_WARS } from "./war-review";

const src = { citation: "Test source" };
const both = [src, { citation: "Second source" }];
const t = (en: string) => ({ en, es: en, zh: en });

const registry = {
  cultures: [
    { id: "aztec", region: "mesoamerica", label: "Aztec" },
    { id: "rome", region: "europe", label: "Rome" },
  ],
};

const aztec = {
  id: "aztec",
  region: "mesoamerica",
  wikidataId: "Q12542",
  name: t("Aztec Empire"),
  description: t("d"),
  reviewed: { es: false, zh: false },
  periods: [{ id: "main", earliestStart: 1325, latestStart: 1325, earliestEnd: 1521, latestEnd: 1521, sources: [src], default: true }],
  events: [
    ...Array.from({ length: 4 }, (_, i) => ({ id: `e${i}`, start: 1400 + i, type: "ruler", title: t("t"), sources: both })),
    {
      id: "fall-of-tenochtitlan",
      start: 1521,
      type: "collapse",
      title: t("Tenochtitlan taken"),
      sources: both,
      place: { name: t("Tenochtitlan"), lat: 19.435, lon: -99.1314 },
    },
  ],
  facts: [{ id: "f", text: t("f"), start: 1400, end: 1500, sources: [src] }],
};

const place = (lon: number, lat: number) => ({ name: t("somewhere"), lat, lon });

type Dates = { earliestStart: number; latestEnd?: number; asOf?: string };

/**
 * A valid war unless the overrides break it. Events are padded with fillers at
 * the war's first year, and a flagship gets two phases, so each fixture meets
 * its tier's rules and a test checks one rule at a time.
 */
function warJson(id: string, overrides: Record<string, unknown> = {}) {
  const tier = (overrides.tier as string | undefined) ?? "standard";
  const dates = (overrides.period ?? overrides.ongoing ?? { earliestStart: 1519, latestEnd: 1521 }) as Dates;
  const from = dates.earliestStart;
  const to = dates.latestEnd ?? Number(dates.asOf?.slice(0, 4));
  const own = (overrides.events as unknown[] | undefined) ?? [
    { id: "battle", start: 1520, title: t("A battle"), sources: both, place: place(-98.2, 19.3) },
  ];
  const minimum = tier === "flagship" ? 15 : 3;
  const fillers = Array.from({ length: Math.max(0, minimum - own.length) }, (_, i) => ({
    id: `filler-${i}`,
    start: from,
    title: t("filler"),
    sources: both,
    place: place(-98.2, 19.3),
  }));
  const phases =
    tier === "flagship"
      ? [
          { id: "opening", name: t("Opening"), start: from, end: from, sources: [src] },
          { id: "rest", name: t("Rest"), start: from, end: to, sources: [src] },
        ]
      : [];
  return {
    id,
    wikidataId: "Q1",
    name: t(id),
    description: t("An account."),
    outcome: t("One side took the city."),
    tier: "standard",
    sensitive: false,
    reviewed: { es: false, zh: false },
    period: { id: "war", earliestStart: 1519, latestStart: 1519, earliestEnd: 1521, latestEnd: 1521, sources: [src] },
    sides: [
      { id: "a", label: t("A"), members: [{ kind: "state", code: "ES", role: "belligerent", today: ["ES"] }] },
      { id: "b", label: t("B"), members: [{ kind: "culture", id: "aztec", role: "belligerent", today: ["MX"] }] },
    ],
    phases,
    sources: [src],
    ...overrides,
    events: [...own, ...fillers],
  };
}

const warFile = (id: string, data: unknown): DataFile => ({ path: `data/wars/${id}.json`, data });

function run(warFiles: DataFile[], borderFiles: DataFile[] = []) {
  return validateDataset({
    buildDate: "2026-09-30",
    registry,
    cultureFiles: [{ path: "data/cultures/mesoamerica/aztec.json", data: aztec }],
    borderFiles,
    popular: { cultures: ["aztec"] },
    warFiles,
  });
}
const errorsFor = (war: unknown, id = "w") => run([warFile(id, war)]).errors.join("\n");

const bordersFile = (warId: string): DataFile => ({
  path: `data/borders/${warId}.json`,
  data: {
    warId,
    sources: [src],
    snapshots: [
      {
        year: 1519,
        polities: [
          {
            id: "triple-alliance",
            label: t("Aztec Empire"),
            role: "self",
            geometry: { type: "Polygon", coordinates: [[[-99, 19], [-98, 19], [-98, 20], [-99, 19]]] },
          },
        ],
      },
    ],
  },
});

describe("wars", () => {
  it("accepts a valid war and returns it with its events in year order", () => {
    const result = run([warFile("w", warJson("w"))]);
    expect(result.errors).toEqual([]);
    expect(result.wars.map((w) => w.id)).toEqual(["w"]);
  });

  it("rejects schema errors", () => {
    expect(errorsFor(warJson("w", { tier: "epic" }))).toMatch(/data\/wars\/w\.json: tier/);
    expect(errorsFor(warJson("w", { sides: [] }))).toMatch(/sides/);
  });

  it("rejects duplicate war ids and a file name that disagrees with the id", () => {
    expect(run([warFile("w", warJson("w")), { path: "data/wars/w-copy.json", data: warJson("w") }]).errors.join("\n")).toMatch(
      /duplicate war id "w"/,
    );
    expect(errorsFor(warJson("other"), "w")).toMatch(/data\/wars\/w\.json: should live at data\/wars\/other\.json/);
  });

  it("rejects a war id that a culture already uses, since both serve /geo/borders/<id>.json", () => {
    expect(errorsFor(warJson("aztec"), "aztec")).toMatch(/"aztec" is a culture id/);
  });

  it("needs exactly one of period and ongoing", () => {
    const ongoing = { earliestStart: 2014, latestStart: 2014, asOf: "2026-09-30", sources: [src] };
    expect(errorsFor(warJson("w", { ongoing }))).toMatch(/exactly one of period/);
    expect(errorsFor(warJson("w", { period: undefined }))).toMatch(/exactly one of period/);
    const events = [{ id: "e", start: 2022, title: t("e"), sources: both, place: place(30.5, 50.4) }];
    expect(errorsFor(warJson("w", { period: undefined, ongoing, events }))).toBe("");
    expect(errorsFor(warJson("w", { period: undefined, ongoing: { ...ongoing, asOf: "30/09/2026" }, events }))).toMatch(/asOf/);
  });

  it("rejects an unknown culture id in a side or in cultures[]", () => {
    const sides = [
      warJson("w").sides[0],
      { id: "b", label: t("B"), members: [{ kind: "culture", id: "mexica", role: "belligerent", today: ["MX"] }] },
    ];
    expect(errorsFor(warJson("w", { sides }))).toMatch(/"mexica" is not in data\/registry\.json/);
    expect(errorsFor(warJson("w", { cultures: ["olmec"] }))).toMatch(/"olmec" is not in data\/registry\.json/);
    expect(errorsFor(warJson("w", { cultures: ["aztec"] }))).toBe("");
  });

  it("rejects an unknown war in follows, and a followed war that starts later", () => {
    expect(errorsFor(warJson("w", { follows: "nope" }))).toMatch(/follows "nope", which has no file/);
    const earlier = warJson("earlier", {
      period: { id: "war", earliestStart: 1500, latestStart: 1500, earliestEnd: 1510, latestEnd: 1510, sources: [src] },
      events: [{ id: "e", start: 1505, title: t("e"), sources: both, place: place(-98, 19) }],
    });
    expect(run([warFile("earlier", earlier), warFile("w", warJson("w", { follows: "earlier" }))]).errors).toEqual([]);
    expect(
      run([warFile("earlier", { ...earlier, follows: "w" }), warFile("w", warJson("w"))]).errors.join("\n"),
    ).toMatch(/earlier follows "w", which starts later/);
  });

  describe("today codes", () => {
    const withToday = (today: string[]) =>
      warJson("w", {
        sides: [
          { id: "a", label: t("A"), members: [{ kind: "polity", name: t("A polity"), role: "belligerent", today }] },
          warJson("w").sides[1],
        ],
      });

    it("accepts UN member states", () => {
      expect(errorsFor(withToday(["CN", "VN"]))).toBe("");
    });

    it("rejects codes that are not UN members, and the never-shown list", () => {
      expect(errorsFor(withToday(["VA"]))).toMatch(/"VA" is not a UN member state/);
      for (const code of ["TW", "HK", "MO", "EH", "PS", "XK"]) {
        expect(errorsFor(withToday([code]))).toMatch(new RegExp(`"${code}" is never shown`));
      }
    });

    it("rejects a state member that is not a listable country, since it gets a flag", () => {
      const sides = [
        { id: "a", label: t("A"), members: [{ kind: "state", code: "TW", role: "belligerent", today: ["CN"] }] },
        warJson("w").sides[1],
      ];
      expect(errorsFor(warJson("w", { sides }))).toMatch(/"TW" is never shown/);
    });

    it("allows 1-3 codes per member", () => {
      expect(errorsFor(withToday([]))).toMatch(/today/);
      expect(errorsFor(withToday(["CN", "VN", "LA", "KH"]))).toMatch(/today/);
    });
  });

  describe("events", () => {
    const withEvent = (event: Record<string, unknown>) =>
      warJson("w", { events: [{ id: "e", start: 1520, title: t("e"), sources: both, place: place(-98, 19), ...event }] });

    it("rejects an event outside the war's outer period", () => {
      expect(errorsFor(withEvent({ start: 1518 }))).toMatch(/event "e" \(1518\) is outside the war/);
      expect(errorsFor(withEvent({ start: 1521, end: 1522 }))).toMatch(/event "e" \(1521-1522\) is outside the war/);
    });

    it("rejects an event with fewer than 2 sources, or with no place to pin", () => {
      expect(errorsFor(withEvent({ sources: [src] }))).toMatch(/at least 2 independent sources/);
      expect(errorsFor(withEvent({ place: undefined }))).toMatch(/place/);
    });

    it("resolves a culture event reference into the war's events", () => {
      const result = run([warFile("w", warJson("w", { cultureEvents: [{ culture: "aztec", event: "fall-of-tenochtitlan" }] }))]);
      expect(result.errors).toEqual([]);
      const events = result.wars[0].events;
      expect(events.map((e) => [e.id, e.start])).toEqual([
        ["filler-0", 1519],
        ["filler-1", 1519],
        ["battle", 1520],
        ["fall-of-tenochtitlan", 1521],
      ]);
      expect(events[3].place?.name.en).toBe("Tenochtitlan");
    });

    it("keeps the file's order within a year, so same-year events stay in the order they happened", () => {
      const e = (id: string, start: number) => ({ id, start, title: t(id), sources: both, place: place(-98, 19) });
      const result = run([warFile("w", warJson("w", { events: [e("zebra", 1519), e("apple", 1519), e("later", 1520), e("first", 1519)] }))]);
      expect(result.wars[0].events.map((x) => x.id)).toEqual(["zebra", "apple", "first", "later"]);
    });

    it("rejects a reference to a missing culture event, or to one without a place", () => {
      expect(errorsFor(warJson("w", { cultureEvents: [{ culture: "aztec", event: "nope" }] }))).toMatch(
        /aztec has no event "nope"/,
      );
      expect(errorsFor(warJson("w", { cultureEvents: [{ culture: "aztec", event: "e1" }] }))).toMatch(
        /aztec event "e1" has no place/,
      );
    });

    it("rejects an event id the war uses twice, counting references", () => {
      const cultureEvents = [{ culture: "aztec", event: "fall-of-tenochtitlan" }];
      const events = [{ id: "fall-of-tenochtitlan", start: 1521, title: t("e"), sources: both, place: place(-99, 19) }];
      expect(errorsFor(warJson("w", { cultureEvents, events }))).toMatch(/duplicate event id "fall-of-tenochtitlan"/);
    });
  });

  describe("casualties", () => {
    const withCasualty = (c: Record<string, unknown>) =>
      warJson("w", { casualties: [{ scope: "battle-deaths", low: 1000, high: 2000, sources: [src], ...c }] });

    it("accepts a sourced range, and a single figure attributed to whoever gives it", () => {
      expect(errorsFor(withCasualty({}))).toBe("");
      expect(errorsFor(withCasualty({ low: 1500, high: 1500, attributedTo: t("Side A's government"), side: "a" }))).toBe("");
    });

    it("rejects one without sources, with high below low, or a bare unattributed number", () => {
      expect(errorsFor(withCasualty({ sources: [] }))).toMatch(/needs its sources/);
      expect(errorsFor(withCasualty({ low: 2000, high: 1000 }))).toMatch(/high \(1000\) is below low \(2000\)/);
      expect(errorsFor(withCasualty({ low: 1500, high: 1500 }))).toMatch(/must be attributedTo/);
    });

    it("rejects a side that the war doesn't have", () => {
      expect(errorsFor(withCasualty({ side: "c" }))).toMatch(/no side "c"/);
      expect(errorsFor(warJson("w", { leaders: [{ name: t("L"), side: "c", role: t("r"), wikidataId: "Q2" }] }))).toMatch(/no side "c"/);
    });
  });

  describe("borders", () => {
    it("accepts a borders file for a flagship war that ends by 1800", () => {
      const result = run([warFile("w", warJson("w", { tier: "flagship" }))], [bordersFile("w")]);
      expect(result.errors).toEqual([]);
      expect(result.borders.map((b) => b.warId)).toEqual(["w"]);
    });

    it("rejects one for a standard-tier war, for a war that ends after 1800, or for no war at all", () => {
      expect(run([warFile("w", warJson("w"))], [bordersFile("w")]).errors.join("\n")).toMatch(/only flagship wars get polygons/);
      const late = warJson("w", {
        tier: "flagship",
        period: { id: "war", earliestStart: 1799, latestStart: 1799, earliestEnd: 1801, latestEnd: 1801, sources: [src] },
        events: [],
      });
      expect(run([warFile("w", late)], [bordersFile("w")]).errors.join("\n")).toMatch(/ends after 1800/);
      expect(run([], [bordersFile("w")]).errors.join("\n")).toMatch(/"w" is not a war id/);
    });

    it("needs exactly one of cultureId and warId", () => {
      const file = bordersFile("w");
      const data = { ...(file.data as object), cultureId: "aztec" };
      expect(run([warFile("w", warJson("w", { tier: "flagship" }))], [{ ...file, data }]).errors.join("\n")).toMatch(
        /exactly one of cultureId and warId/,
      );
    });
  });

  describe("pins in contested areas", () => {
    const pinAt = (lon: number, lat: number) =>
      warJson("w", {
        period: { id: "war", earliestStart: 1500, latestStart: 1500, earliestEnd: 1999, latestEnd: 1999, sources: [src] },
        events: [{ id: "e", start: 1950, title: t("e"), sources: both, place: place(lon, lat) }],
      });

    it.each([
      ["Taipei", 121.56, 25.04],
      ["Penghu", 119.6, 23.57],
      ["Kinmen", 118.32, 24.44],
      ["Matsu", 119.95, 26.16],
      ["Srinagar", 74.8, 34.08],
      ["Aksai Chin", 79.5, 35.2],
      ["Tawang", 91.86, 27.59],
      ["Bomdila", 92.42, 27.26],
      ["Paracels", 112.3, 16.5],
      ["Spratlys", 114.3, 10.4],
      ["Scarborough Shoal", 117.76, 15.15],
      ["Senkaku", 123.5, 25.75],
    ])("rejects a pin at %s", (_, lon, lat) => {
      expect(errorsFor(pinAt(lon, lat))).toMatch(/inside a contested area/);
    });

    it.each([
      ["Xiamen (Amoy)", 118.09, 24.48],
      ["Fuzhou", 119.3, 26.07],
      ["Chillianwala", 73.6, 32.66],
      ["Gujrat", 74.08, 32.57],
      ["Jammu", 74.86, 32.73],
      ["Tezpur", 92.8, 26.63],
      ["Hong Kong (Victoria Harbour)", 114.17, 22.29],
      ["Manila", 120.98, 14.6],
      ["Trashigang, Bhutan", 91.55, 27.33],
      ["Tsetang, Tibet", 91.77, 29.24],
    ])("accepts a pin at %s, just outside", (_, lon, lat) => {
      expect(errorsFor(pinAt(lon, lat))).toBe("");
    });
  });

  describe("BCE years (astronomical: N BCE = -(N-1))", () => {
    // Greco-Persian Wars, 499-449 BCE; Marathon, 490 BCE.
    const greek = (period: Record<string, number>, start: number) =>
      warJson("w", {
        period: { id: "war", sources: [src], ...period },
        events: [{ id: "marathon", start, title: t("Marathon"), sources: both, place: place(23.96, 38.12) }],
      });

    it("accepts a BCE war written in astronomical years", () => {
      expect(errorsFor(greek({ earliestStart: -498, latestStart: -498, earliestEnd: -448, latestEnd: -448 }, -489))).toBe("");
    });

    it("rejects an end before the start, the usual sign of a sign or off-by-one slip", () => {
      expect(errorsFor(greek({ earliestStart: -498, latestStart: -498, earliestEnd: -499, latestEnd: -499 }, -489))).toMatch(
        /start <= end/,
      );
    });

    it("rejects an event a year outside a BCE war, as an unconverted start year would be", () => {
      // 499 BCE written as -499 instead of -498 puts the opening event a year before the war.
      expect(errorsFor(greek({ earliestStart: -498, latestStart: -498, earliestEnd: -448, latestEnd: -448 }, -499))).toMatch(
        /outside the war/,
      );
    });
  });

  describe("review gate (decision 9)", () => {
    it("pins the sensitive list and starts with nothing reviewed", () => {
      expect([...SENSITIVE_WARS].sort()).toEqual([
        "falklands-war",
        "korean-war",
        "russo-ukrainian-war-2022",
        "russo-ukrainian-war",
        "second-sino-japanese-war",
        "vietnam-war",
      ]);
      expect([...REVIEWED]).toEqual([]);
    });

    it("rejects a war on the sensitive list that isn't marked sensitive", () => {
      expect(errorsFor(warJson("korean-war"), "korean-war")).toMatch(/korean-war is on the sensitive list/);
      expect(errorsFor(warJson("korean-war", { sensitive: true }), "korean-war")).toBe("");
    });

    it("rejects reviewed: true for a language James hasn't signed off in war-review.ts", () => {
      expect(errorsFor(warJson("w", { reviewed: { es: true, zh: false } }))).toMatch(/reviewed\.es is true/);
      expect(errorsFor(warJson("w", { sensitive: true, reviewed: { es: false, zh: true } }))).toMatch(/reviewed\.zh is true/);
    });
  });

  describe("names", () => {
    it("needs all three titles, so a gap fails instead of showing English", () => {
      expect(errorsFor(warJson("w", { name: { en: "W", es: "W" } }))).toMatch(/name\.zh/);
      expect(errorsFor(warJson("w", { name: { en: "W", zh: "W" } }))).toMatch(/name\.es/);
    });

    it("accepts a title marked as ours where that language's Wikipedia has no article", () => {
      expect(errorsFor(warJson("w", { noWikiTitle: ["es"] }))).toBe("");
      expect(errorsFor(warJson("w", { noWikiTitle: ["en"] }))).toMatch(/noWikiTitle/);
    });
  });

  describe("tiers", () => {
    const exact = (tier: string, count: number) => {
      const base = warJson("w", { tier });
      const e = (i: number) => ({ id: `e${i}`, start: 1520, title: t("e"), sources: both, place: place(-98, 19) });
      return { ...base, events: Array.from({ length: count }, (_, i) => e(i)) };
    };

    it("holds a standard war to 3-8 events", () => {
      expect(errorsFor(exact("standard", 2))).toMatch(/standard wars have 3-8 events; this has 2/);
      expect(errorsFor(exact("standard", 3))).toBe("");
      expect(errorsFor(exact("standard", 8))).toBe("");
      expect(errorsFor(exact("standard", 9))).toMatch(/standard wars have 3-8 events; this has 9/);
    });

    it("holds a flagship war to 15-30 events and at least two phases", () => {
      expect(errorsFor(exact("flagship", 14))).toMatch(/flagship wars have 15-30 events; this has 14/);
      expect(errorsFor(exact("flagship", 15))).toBe("");
      expect(errorsFor(exact("flagship", 30))).toBe("");
      expect(errorsFor(exact("flagship", 31))).toMatch(/flagship wars have 15-30 events; this has 31/);
      const onePhase = warJson("w", { tier: "flagship" });
      expect(errorsFor({ ...onePhase, phases: onePhase.phases.slice(1) })).toMatch(/flagship wars need at least 2 phases/);
    });

    it("counts culture event references as events", () => {
      const base = warJson("w");
      const two = { ...base, events: base.events.slice(0, 2), cultureEvents: [{ culture: "aztec", event: "fall-of-tenochtitlan" }] };
      expect(errorsFor(two)).toBe("");
    });
  });

  it("rejects a phase outside the war's outer period", () => {
    const base = warJson("w", { tier: "flagship" });
    const phases = [{ id: "early", name: t("Early"), start: 1517, end: 1519, sources: [src] }, base.phases[1]];
    expect(errorsFor({ ...base, phases })).toMatch(/phase "early" \(1517-1519\) is outside the war \(1519 to 1521\)/);
  });

  it("rejects an ongoing war checked after the build date", () => {
    const ongoing = (asOf: string) => ({ earliestStart: 2014, latestStart: 2014, asOf, sources: [src] });
    expect(errorsFor(warJson("w", { period: undefined, ongoing: ongoing("2026-09-30"), events: undefined }))).not.toMatch(/asOf/);
    expect(errorsFor(warJson("w", { period: undefined, ongoing: ongoing("2026-10-01") }))).toMatch(
      /asOf 2026-10-01 is after the build date 2026-09-30/,
    );
  });

  it("warns, but does not fail, on missing translations", () => {
    const result = run([warFile("w", warJson("w", { outcome: { en: "o" } }))]);
    expect(result.errors).toEqual([]);
    expect(result.warnings.join("\n")).toMatch(/war w: missing es in 1 text/);
  });
});
