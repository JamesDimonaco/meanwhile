import { describe, expect, it } from "vitest";
import type { Casualty, War } from "./war-schema";
import { casualtyGroups, countryIndex, gapsOnPagesIn, isShownIn, localeGaps, warLand, warsForCountry, warsForCulture, warsShownIn } from "./wars";

const t = (en: string) => ({ en });
const src = [{ citation: "s" }];

function war(id: string, start: number, opts: Partial<War> & { today?: string[][] } = {}): War {
  const [a = ["ES"], b = ["MX"]] = opts.today ?? [];
  return {
    id,
    wikidataId: "Q1",
    name: { en: id, es: id, zh: id },
    noWikiTitle: [],
    aliases: [],
    altNames: [],
    description: t("d"),
    outcome: t("o"),
    tier: "standard",
    sensitive: false,
    reviewed: { es: false, zh: false },
    period: { id: "p", earliestStart: start, latestStart: start, earliestEnd: start + 2, latestEnd: start + 2, sources: src, default: false, disputed: false },
    sides: [
      { id: "a", label: t("A"), members: [{ kind: "polity", name: t("A"), role: "belligerent", today: a }] },
      { id: "b", label: t("B"), members: [{ kind: "culture", id: "aztec", role: "belligerent", today: b }] },
    ],
    phases: [],
    events: [],
    leaders: [],
    casualties: [],
    cultures: [],
    sources: src,
    ...opts,
  };
}

describe("the review gate", () => {
  const plain = war("plain", 1500);
  const sensitive = war("sensitive", 1950, { sensitive: true, reviewed: { es: true, zh: false } });

  it("always shows English", () => {
    expect(isShownIn(sensitive, "en")).toBe(true);
  });

  it("hides a sensitive war in a language nobody has reviewed yet", () => {
    expect(isShownIn(sensitive, "zh")).toBe(false);
    expect(isShownIn(sensitive, "es")).toBe(true);
  });

  it("shows a war that isn't sensitive in every language, reviewed or not", () => {
    expect(isShownIn(plain, "zh")).toBe(true);
  });

  it("filters a list", () => {
    expect(warsShownIn([plain, sensitive], "zh").map((w) => w.id)).toEqual(["plain"]);
  });

  it("names the pages missing in some language, so no link there leads to a 404", () => {
    const onlyKr = war("korea", 1950, { sensitive: true, today: [["KR"], ["KP"]] });
    expect(localeGaps([plain, onlyKr])).toEqual({
      "/war/korea": ["en"],
      "/wars/kr": ["en"],
      "/wars/kp": ["en"],
    });
  });

  it("keeps a gated war's id out of the pages of a language it is hidden in", () => {
    const onlyKr = war("korea", 1950, { sensitive: true, today: [["KR"], ["KP"]] });
    const esOnly = war("esonly", 1900, { sensitive: true, reviewed: { es: true, zh: false } });
    const gaps = localeGaps([plain, onlyKr, esOnly]);
    expect(gapsOnPagesIn(gaps, "zh")).toEqual({});
    expect(gapsOnPagesIn(gaps, "es")).toEqual({ "/war/esonly": ["en", "es"] });
    expect(gapsOnPagesIn(gaps, "en")).toEqual(gaps);
  });
});

describe("wars by country and culture", () => {
  const later = war("later", 1800, { today: [["MX"], ["US"]] });
  const earlier = war("earlier", 1519, { cultures: ["aztec"] });
  const bce = war("bce", -263, { today: [["IT"], ["TN"]], cultures: ["rome"] });

  it("lists a country's wars oldest first, BCE before CE", () => {
    expect(warsForCountry([later, earlier, bce], "MX").map((w) => w.id)).toEqual(["earlier", "later"]);
    expect(warsForCountry([later, earlier, bce], "IT").map((w) => w.id)).toEqual(["bce"]);
  });

  it("counts a state member's own code, not only its today list", () => {
    const withState = war("state", 1982, {
      sides: [
        { id: "a", label: t("A"), members: [{ kind: "state", code: "GB", role: "belligerent", today: ["GB"] }] },
        { id: "b", label: t("B"), members: [{ kind: "state", code: "AR", role: "belligerent", today: ["AR"] }] },
      ],
    });
    expect(warsForCountry([withState], "AR").map((w) => w.id)).toEqual(["state"]);
  });

  it("lists the wars a culture's page links to", () => {
    expect(warsForCulture([later, earlier, bce], "aztec").map((w) => w.id)).toEqual(["earlier"]);
    expect(warsForCulture([later, earlier, bce], "inca")).toEqual([]);
  });
});

describe("countryIndex", () => {
  it("lists each country once with its name in the page's language, continent and war count, sorted by name", () => {
    const wars = [war("one", 1519), war("two", 1846, { today: [["US"], ["MX"]] })];
    expect(countryIndex(wars, "en").map(({ code, name, continent, count }) => ({ code, name, continent, count }))).toEqual([
      { code: "MX", name: "Mexico", continent: "americas", count: 2 },
      { code: "ES", name: "Spain", continent: "europe", count: 1 },
      { code: "US", name: "United States", continent: "americas", count: 1 },
    ]);
    expect(countryIndex(wars, "es").map((c) => c.name)).toEqual(["España", "Estados Unidos", "México"]);
    expect(countryIndex(wars, "zh").find((c) => c.code === "MX")?.name).toBe("墨西哥");
  });

  it("lets a country be found by its code or its name in any language, whatever the page's language", () => {
    const mexico = countryIndex([war("one", 1519)], "zh").find((c) => c.code === "MX");
    expect(mexico?.terms).toEqual(["MX", "Mexico", "México", "墨西哥"]);
  });
});

describe("warLand", () => {
  const cultures = [
    { id: "aztec", region: "mesoamerica" },
    { id: "inca", region: "south-america" },
  ] as const;

  it("draws a war with a borders file on its cultures' own region, not the whole world", () => {
    expect(warLand(war("w", 1519), cultures, true)).toBe("mesoamerica");
  });

  it("keeps a pins-only war on the whole world", () => {
    expect(warLand(war("w", 1519), cultures, false)).toBe("world");
  });

  it("falls back to the whole world when the war's cultures span two regions", () => {
    expect(warLand(war("w", 1519, { cultures: ["inca"] }), cultures, true)).toBe("world");
  });
});

describe("casualty groups", () => {
  const fig = (scope: Casualty["scope"], side: string | undefined, low: number, who?: string): Casualty => ({
    scope,
    side,
    low,
    high: low + 1,
    who: who === undefined ? undefined : t(who),
    sources: src,
  });

  it("groups rival estimates of the same thing, in file order", () => {
    const a = fig("military-deaths", "a", 1);
    const b = fig("military-deaths", "a", 2);
    const c = fig("total-deaths", "a", 3);
    expect(casualtyGroups([a, c, b])).toEqual([[a, b], [c]]);
  });

  it("never sets a count of one member beside the whole side's, as if they were rival estimates", () => {
    const side = fig("military-deaths", "a", 1);
    const spaniards = fig("military-deaths", "a", 2, "Spaniards");
    const allSides = fig("military-deaths", undefined, 3);
    expect(casualtyGroups([side, spaniards, allSides])).toEqual([[side], [spaniards], [allSides]]);
  });
});
