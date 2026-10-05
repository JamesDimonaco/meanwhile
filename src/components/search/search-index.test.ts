import { describe, expect, it } from "vitest";
import type { Locale } from "@/i18n/locales";
import { countryCodes } from "@/lib/data/country";
import { loadAllWars, loadCultures, loadHeartland, loadWars } from "@/lib/data/load";
import type { War } from "@/lib/data/war-schema";
import { countrySearchEntries, search, searchIndex, toSearchEntry, warSearchEntries, type SearchEntry, type SearchHit } from "./search-index";

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
const cultures = (...entries: SearchEntry[]) => searchIndex({ cultures: entries });

describe("search", () => {
  const index = cultures(shang, inca);

  it("returns nothing for a blank query", () => {
    expect(search("", index)).toEqual([]);
    expect(search("   ", index)).toEqual([]);
  });

  it("matches an English name", () => {
    expect(search("shang", index)).toEqual([{ type: "culture", entry: shang }]);
  });

  it("matches native-script characters directly", () => {
    expect(search("商", index)).toEqual([{ type: "culture", entry: shang }]);
  });

  it("matches an accented pinyin alias without the accent", () => {
    // Only the accented spelling is in the data, and the id doesn't contain
    // the query, so this can only match once the macron is stripped.
    const zhou = entry({ id: "c1", name: { en: "Zhōu" }, nativeName: undefined, aliases: ["Zhōu"] });
    expect(search("zhou", cultures(zhou))).toEqual([{ type: "culture", entry: zhou }]);
  });

  it("matches a Spanish localized name", () => {
    expect(search("imperio inca", index)).toEqual([{ type: "culture", entry: inca }]);
  });

  it("matches a non-English native name", () => {
    expect(search("tawantinsuyu", index)).toEqual([{ type: "culture", entry: inca }]);
  });

  it("ranks an exact alias match above a mere substring match", () => {
    // "vinca" only contains "inca"; the Inca entry's alias "Inca" is exact,
    // so it must sort first even though "vinca" would otherwise win by id order.
    const vinca = entry({ id: "vinca", name: { en: "Vinca culture" }, aliases: ["Vinca"], nativeName: undefined });
    expect(search("inca", cultures(vinca, inca))).toEqual([
      { type: "culture", entry: inca },
      { type: "culture", entry: vinca },
    ]);
  });

  it("recognises a typed year and returns it ahead of name matches", () => {
    expect(search("1200 BCE", index)[0]).toEqual({ type: "year", year: -1199 });
  });

  it("does not treat a plain word as a year", () => {
    expect(search("shang", index).some((r) => r.type === "year")).toBe(false);
  });
});

describe("war search entries", () => {
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
    const index = searchIndex({ wars: warSearchEntries([open, gated], "en") });
    const ids = (q: string) => search(q, index).map((h) => (h.type === "war" ? h.entry.id : h.type));
    expect(ids("guerras punicas")).toEqual(["open"]);
    expect(ids("布匿")).toEqual(["open"]);
    expect(ids("bella")).toEqual(["open"]);
  });
});

describe("country search entries", () => {
  it("names each country in the page's language and finds it by its name in any language", () => {
    const [mexico] = countrySearchEntries(["MX"], "zh");
    expect(mexico.name).toBe("墨西哥");
    expect(search("mexico", searchIndex({ countries: [mexico] }))).toEqual([{ type: "country", entry: mexico }]);
  });
});

// The home page's index, built the way the page builds it, from the real data.
const heartland = loadHeartland();
const allCultures = loadCultures().map(toSearchEntry);
function homeIndex(locale: Locale) {
  const wars = loadWars(locale);
  return searchIndex({
    countries: countrySearchEntries(countryCodes(heartland, wars), locale),
    cultures: allCultures,
    wars: warSearchEntries(wars, locale),
  });
}
const indexes = { en: homeIndex("en"), es: homeIndex("es"), zh: homeIndex("zh") };
const label = (hit: SearchHit) =>
  hit.type === "year" ? `year:${hit.year}` : hit.type === "country" ? `country:${hit.entry.code}` : `${hit.type}:${hit.entry.id}`;
const labels = (query: string, locale: Locale) => search(query, indexes[locale]).map(label);

describe("misspellings people type, against the real data", () => {
  it.each<[Locale, string, string]>([
    ["en", "azteck", "culture:aztec"],
    ["en", "inka", "culture:inca"],
    ["en", "mexcio", "country:MX"],
    ["en", "mexci", "country:MX"],
    ["en", "mexi", "country:MX"],
    ["en", "vietman", "country:VN"],
    ["en", "vietn", "country:VN"],
    ["en", "chinna", "country:CN"],
    ["en", "egipt", "country:EG"],
    ["en", "egpt", "country:EG"],
    ["en", "untied states", "country:US"],
    ["en", "brittain", "country:GB"],
    ["en", "fillipines", "country:PH"],
    ["en", "peloponesian", "war:peloponnesian-war"],
    ["en", "peleop", "war:peloponnesian-war"],
    ["en", "opiom war", "war:first-opium-war"],
    ["en", "mongal", "culture:yuan"],
    ["en", "maian", "culture:maya"],
    ["en", "uk", "country:GB"],
    ["en", "usa", "country:US"],
    ["en", "england", "country:GB"],
    ["en", "great britain", "country:GB"],
    ["en", "britain", "country:GB"],
    ["en", "america", "country:US"],
    ["en", "holland", "country:NL"],
    ["en", "turkey", "country:TR"],
    ["es", "mejico", "country:MX"],
    ["es", "vietnan", "country:VN"],
    ["es", "egipto", "country:EG"],
    ["es", "inglaterra", "country:GB"],
    ["es", "eeuu", "country:US"],
    ["es", "EE. UU.", "country:US"],
    ["es", "gran bretana", "country:GB"],
    ["es", "holanda", "country:NL"],
    ["es", "azteca", "culture:aztec"],
    ["es", "guerra del opio", "war:first-opium-war"],
    ["zh", "中国", "country:CN"],
    ["zh", "越南", "country:VN"],
    ["zh", "阿兹特克", "culture:aztec"],
    ["zh", "mexcio", "country:MX"],
  ])("%s: %s -> %s", (locale, query, expected) => {
    expect(labels(query, locale)[0]).toBe(expected);
  });
});

describe("false positives", () => {
  const termsOf = (locale: Locale, hit: SearchHit) => indexes[locale].find((r) => r.item === hit)?.terms.map((t) => t.text) ?? [];
  const hitsWhoseTerms = (query: string, test: (term: string) => boolean) =>
    search(query, indexes.en).filter((hit) => !termsOf("en", hit).some(test)).map(label);

  it("finds only names with the word in them for 'war'", () => {
    expect(search("war", indexes.en).length).toBeGreaterThan(0);
    expect(hitsWhoseTerms("war", (t) => t.includes("war"))).toEqual([]);
  });

  it("finds only words starting with a two-letter query", () => {
    for (const q of ["in", "ma"]) {
      expect(search(q, indexes.en).length).toBeGreaterThan(0);
      expect(hitsWhoseTerms(q, (t) => new RegExp(`(^|[^\\p{L}])${q}`, "u").test(t))).toEqual([]);
    }
  });

  it("answers a bare year with the year alone, and puts a year ahead of names", () => {
    expect(labels("1500", "en")).toEqual(["year:1500"]);
    expect(labels("1453", "en")).toEqual(["year:1453", "war:fall-of-constantinople"]);
  });

  it("brings no near-namesake when a name is spelled right", () => {
    expect(labels("iran", "en")).not.toContain("country:IQ");
    expect(labels("iran", "en")).not.toContain("war:iraq-war");
    expect(labels("inca", "en")).not.toContain("country:IN");
  });

  it("never fuzzes CJK", () => {
    expect(labels("中困", "zh")).toEqual([]);
  });

  it("never offers a country or war the page's language has no page for", () => {
    for (const locale of ["es", "zh"] as const) {
      expect(labels("ukraine", locale)).not.toContain("country:UA");
      expect(labels("korean war", locale)).not.toContain("war:korean-war");
    }
    expect(labels("ukraine", "en")).toContain("country:UA");
  });
});
