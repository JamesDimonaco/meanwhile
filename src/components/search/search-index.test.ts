import { describe, expect, it } from "vitest";
import { loadAllWars } from "@/lib/data/load";
import type { War } from "@/lib/data/war-schema";
import { search, searchWars, warSearchEntries, type SearchEntry } from "./search-index";

function entry(overrides: Partial<SearchEntry>): SearchEntry {
  return {
    id: "shang",
    region: "china",
    name: { en: "Shang dynasty", es: "Dinastía Shang", zh: "商朝" },
    nativeName: { text: "商", lang: "zh-Hans" },
    aliases: ["Shang", "Yin", "殷", "商", "shāng"],
    period: { latestStart: -1500, earliestEnd: -1050 },
    ...overrides,
  };
}

const inca = entry({
  id: "inca",
  region: "south-america",
  name: { en: "Inca Empire", es: "Imperio inca" },
  nativeName: { text: "Tawantinsuyu", lang: "qu" },
  aliases: ["Inca", "Inka", "Incas", "Tahuantinsuyo", "Tawantinsuyu", "印加"],
  period: { latestStart: 1438, earliestEnd: 1533 },
});

const shang = entry({});
const entries = [shang, inca];

describe("search", () => {
  it("returns nothing for a blank query", () => {
    expect(search("", entries)).toEqual([]);
    expect(search("   ", entries)).toEqual([]);
  });

  it("matches an English name", () => {
    const results = search("shang", entries);
    expect(results).toEqual([{ type: "culture", entry: shang }]);
  });

  it("matches native-script characters directly", () => {
    expect(search("商", entries)).toEqual([{ type: "culture", entry: shang }]);
  });

  it("matches an accented pinyin alias without the accent", () => {
    // Only the accented spelling is in the data, and the id doesn't contain
    // the query, so this can only match once the macron is stripped.
    const zhou = entry({ id: "c1", name: { en: "Zhōu" }, nativeName: undefined, aliases: ["Zhōu"] });
    expect(search("zhou", [zhou])).toEqual([{ type: "culture", entry: zhou }]);
  });

  it("matches a Spanish localized name", () => {
    expect(search("imperio inca", entries)).toEqual([{ type: "culture", entry: inca }]);
  });

  it("matches a non-English native name", () => {
    expect(search("tawantinsuyu", entries)).toEqual([{ type: "culture", entry: inca }]);
  });

  it("ranks an exact alias match above a mere substring match", () => {
    // "vinca" only contains "inca" as a substring (score 2); the Inca entry's
    // own alias "Inca" is an exact match (score 0) once case is folded, so it
    // must sort first even though "vinca" would otherwise win by id order.
    const vinca = entry({ id: "vinca", name: { en: "Vinca culture" }, aliases: ["Vinca"], nativeName: undefined });
    const results = search("inca", [vinca, inca]);
    expect(results).toEqual([
      { type: "culture", entry: inca },
      { type: "culture", entry: vinca },
    ]);
  });

  it("recognises a typed year and returns it ahead of name matches", () => {
    const results = search("1200 BCE", entries);
    expect(results[0]).toEqual({ type: "year", year: -1199 });
  });

  it("does not treat a plain word as a year", () => {
    expect(search("shang", entries).some((r) => r.type === "year")).toBe(false);
  });

  it("caps results at the given limit", () => {
    const many: SearchEntry[] = Array.from({ length: 20 }, (_, i) => entry({ id: `culture-${i}` }));
    expect(search("shang", many, 3)).toHaveLength(3);
  });
});

describe("war search", () => {
  const base = loadAllWars()[0];
  const open: War = { ...base, id: "open", name: { en: "Punic Wars", es: "Guerras púnicas", zh: "布匿战争" }, aliases: ["Bella Punica"], altNames: [], sensitive: false };
  const gated: War = { ...open, id: "gated", name: { en: "Korean War", es: "Guerra de Corea", zh: "朝鲜战争" }, aliases: [], sensitive: true, reviewed: { es: false, zh: false } };

  it("keeps a war behind the review gate out of the entries of a language it is hidden in", () => {
    expect(warSearchEntries([open, gated], "es").map((e) => e.id)).toEqual(["open"]);
    expect(warSearchEntries([open, gated], "zh").map((e) => e.id)).toEqual(["open"]);
    expect(warSearchEntries([open, gated], "en").map((e) => e.id)).toEqual(["open", "gated"]);
  });

  it("names each entry in the page's language", () => {
    expect(warSearchEntries([open], "zh")[0].name).toBe("布匿战争");
  });

  it("matches a war by any language's title or an alias, accent insensitive", () => {
    const entries = warSearchEntries([open, gated], "en");
    expect(searchWars("guerras punicas", entries).map((e) => e.id)).toEqual(["open"]);
    expect(searchWars("布匿", entries).map((e) => e.id)).toEqual(["open"]);
    expect(searchWars("bella", entries).map((e) => e.id)).toEqual(["open"]);
  });

  it("ranks an exact title above a substring match and caps the list", () => {
    const entries = warSearchEntries([open, { ...open, id: "korea", name: { en: "War", es: "x", zh: "y" } }, gated], "en");
    expect(searchWars("war", entries).map((e) => e.id)).toEqual(["korea", "gated", "open"]);
    expect(searchWars("war", entries, 2)).toHaveLength(2);
    expect(searchWars("  ", entries)).toEqual([]);
  });
});
