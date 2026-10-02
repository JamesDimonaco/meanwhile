import { describe, expect, it } from "vitest";
import { LOCALES } from "@/i18n/locales";
import { NEVER_SHOWN } from "./countries";
import { type CountryItem, countryCodes, countryItems, gapsOnPagesIn, itemBounds, itemId, localeGaps, overlapping, overlaps } from "./country";
import { loadAllWars, loadCultures, loadHeartland, loadWars } from "./load";
import type { War } from "./war-schema";
import { warCountryCodes } from "./wars";

describe("overlaps", () => {
  const atWar = (id: string, latestStart: number, earliestEnd: number, fuzz = 0): CountryItem => ({
    kind: "war",
    war: war(id, ["MX"], {
      period: { id: "p", earliestStart: latestStart - fuzz, latestStart, earliestEnd, latestEnd: earliestEnd + fuzz, sources: [], default: false, disputed: false },
    }),
  });

  it("counts a single shared year when a war is one of the pair", () => {
    expect(overlaps(atWar("a", 1000, 1100), atWar("b", 1100, 1200))).toBe(true);
  });

  it("does not count ranges a year apart", () => {
    expect(overlaps(atWar("a", 1000, 1100), atWar("b", 1101, 1200))).toBe(false);
  });

  it("ignores the fuzzy edges", () => {
    expect(overlaps(atWar("a", 1000, 1100, 30), atWar("b", 1110, 1200, 30))).toBe(false);
  });

  it("is symmetric and counts containment", () => {
    expect(overlaps(atWar("a", 1200, 1210), atWar("b", 1000, 1500))).toBe(true);
    expect(overlaps(atWar("a", 1000, 1500), atWar("b", 1200, 1210))).toBe(true);
  });
});

describe("overlaps, with the real data", () => {
  const cultures = loadCultures();
  const wars = loadAllWars();
  const item = (id: string): CountryItem => {
    const culture = cultures.find((c) => c.id === id);
    if (culture) return { kind: "culture", culture };
    const found = wars.find((w) => w.id === id);
    if (!found) throw new Error(`no culture or war ${id}`);
    return { kind: "war", war: found };
  };

  it.each([
    ["inca", "spanish-conquest-of-the-inca-empire"],
    ["song", "mongol-conquest-of-the-song"],
    ["world-war-ii", "second-sino-japanese-war"],
    // Each shares only the civilisation's last year with the war that ended it.
    ["qin-wars-of-unification", "qin"],
    ["rome", "fall-of-constantinople"],
  ])("%s and %s overlap", (a, b) => {
    expect(overlaps(item(a), item(b))).toBe(true);
    expect(overlaps(item(b), item(a))).toBe(true);
  });

  it.each([
    ["sui", "tang"],
    ["yuan", "ming"],
    ["ming", "qing"],
    ["warring-states", "qin"],
    ["paracas", "nazca"],
  ])("%s handing over to %s in one year is not an overlap", (a, b) => {
    expect(overlaps(item(a), item(b))).toBe(false);
    expect(overlaps(item(b), item(a))).toBe(false);
  });

  it("Qin and Han do not, though their fuzzy edges meet", () => {
    expect(overlaps(item("qin"), item("han"))).toBe(false);
  });
});

function war(id: string, codes: string[], opts: Partial<War> = {}): War {
  const t = (en: string) => ({ en });
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
    period: { id: "p", earliestStart: 1900, latestStart: 1900, earliestEnd: 1901, latestEnd: 1901, sources: [], default: false, disputed: false },
    sides: [
      { id: "a", label: t("a"), members: [{ kind: "polity", name: t("a"), role: "belligerent", today: codes }] },
      { id: "b", label: t("b"), members: [{ kind: "polity", name: t("b"), role: "belligerent", today: ["MX"] }] },
    ],
    phases: [],
    events: [],
    leaders: [],
    casualties: [],
    cultures: [],
    sources: [],
    ...opts,
  };
}

describe("countryCodes", () => {
  it("gives a page to every heartland country and every country a shown war lists, sorted", () => {
    expect(countryCodes({ inca: ["PE"], aztec: ["MX"] }, [war("w", ["ES"])])).toEqual(["ES", "MX", "PE"]);
  });

  it("never gives a page to a code that is not a UN member or is never shown", () => {
    expect(countryCodes({ a: ["TW", "PE"], b: ["XK"] }, [war("w", ["HK", "PS"])])).toEqual(["MX", "PE"]);
  });
});

describe("country pages, with the real data", () => {
  const heartland = loadHeartland();
  const cultures = loadCultures();

  it.each(LOCALES)("never exist for a disputed or politically loaded code in %s", (locale) => {
    const codes = countryCodes(heartland, loadWars(locale));
    expect(codes.length).toBeGreaterThan(0);
    for (const code of NEVER_SHOWN) expect(codes).not.toContain(code);
  });

  // Flags link to country pages without checking: these two sets must always have one.
  it.each(LOCALES)("exist in %s for every heartland flag and every state on a war shown there", (locale) => {
    const wars = loadWars(locale);
    const codes = new Set(countryCodes(heartland, wars));
    for (const code of Object.values(heartland).flat()) expect(codes).toContain(code);
    for (const code of warCountryCodes(wars)) expect(codes).toContain(code);
  });

  it("keeps a gated war off China's page in es and zh, and lists it in en", () => {
    const ids = (locale: (typeof LOCALES)[number]) => countryItems("CN", cultures, heartland, loadWars(locale)).map(itemId);
    expect(ids("en")).toContain("second-sino-japanese-war");
    for (const locale of ["es", "zh"] as const) {
      const shown = ids(locale);
      for (const w of loadAllWars().filter((w) => w.sensitive)) expect(shown).not.toContain(w.id);
    }
  });

  it("lists a country's civilisations and wars together, oldest first", () => {
    const ids = countryItems("PE", cultures, heartland, loadWars("en")).map(itemId);
    expect(ids[0]).toBe("caral-supe");
    expect(ids.indexOf("inca")).toBeLessThan(ids.indexOf("spanish-conquest-of-the-inca-empire"));
    const starts = countryItems("CN", cultures, heartland, loadWars("en")).map((i) => itemBounds(i).latestStart);
    expect(starts).toEqual([...starts].sort((a, b) => a - b));
  });

  it("names, for each item, the others on the page it overlapped with", () => {
    const items = countryItems("PE", cultures, heartland, loadWars("en"));
    const withInca = overlapping(items).get("inca")?.map(itemId);
    // Chimu fell to the Inca: their solid spans share 1438-1469.
    expect(withInca).toEqual(["chimu", "spanish-conquest-of-the-inca-empire"]);
    expect(overlapping(items).get("caral-supe")).toEqual([]);
  });
});

describe("locale gaps", () => {
  const plain = war("plain", ["ES"]);
  const onlyKr = war("korea", ["KR", "KP"], { sensitive: true });

  it("names the pages missing in some language, so no link there leads to a 404", () => {
    expect(localeGaps([plain, onlyKr], {})).toEqual({
      "/war/korea": ["en"],
      "/country/kr": ["en"],
      "/country/kp": ["en"],
    });
  });

  it("keeps a country page whose gated wars are hidden when a civilisation still gives it one", () => {
    expect(localeGaps([onlyKr], { goguryeo: ["KR"], aztec: ["MX"] })).toEqual({ "/war/korea": ["en"], "/country/kp": ["en"] });
  });

  it("keeps a gated war's id out of the pages of a language it is hidden in", () => {
    const esOnly = war("esonly", ["ES"], { sensitive: true, reviewed: { es: true, zh: false } });
    const gaps = localeGaps([plain, onlyKr, esOnly], {});
    expect(gapsOnPagesIn(gaps, "zh")).toEqual({});
    expect(gapsOnPagesIn(gaps, "es")).toEqual({ "/war/esonly": ["en", "es"] });
    expect(gapsOnPagesIn(gaps, "en")).toEqual(gaps);
  });
});
