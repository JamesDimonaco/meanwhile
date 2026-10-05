import { describe, expect, it } from "vitest";
import type { Locale } from "@/i18n/locales";
import { countryCodes } from "@/lib/data/country";
import { loadAllWars, loadCultures, loadHeartland, loadWars } from "@/lib/data/load";
import { countryIndex } from "@/lib/data/wars";
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
const cultures = (...entries: SearchEntry[]) => searchIndex({ locale: "en", cultures: entries });

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
    // Only the accented spelling is in the data, and three letters have no
    // typo budget, so this can only match once the tone mark is stripped.
    const qin = entry({ id: "c1", name: { en: "Dynasty" }, nativeName: undefined, aliases: ["Qín"] });
    expect(search("qin", cultures(qin))).toEqual([{ type: "culture", entry: qin }]);
  });

  it("matches a Spanish localized name", () => {
    expect(search("imperio inca", index)).toEqual([{ type: "culture", entry: inca }]);
  });

  it("matches a non-English native name", () => {
    expect(search("tawantinsuyu", index)).toEqual([{ type: "culture", entry: inca }]);
  });

  it("ranks an exact alias match above a prefix match", () => {
    // "inca roads" only starts with "inca"; the Inca entry's alias "Inca" is exact,
    // so it must sort first even though "a-roads" would otherwise win by id order.
    const roads = entry({ id: "a-roads", name: { en: "Inca roads" }, aliases: [], nativeName: undefined });
    expect(search("inca", cultures(roads, inca))).toEqual([
      { type: "culture", entry: inca },
      { type: "culture", entry: roads },
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
    const index = searchIndex({ locale: "en", wars: warSearchEntries([open, gated], "en") });
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
    expect(search("mexico", searchIndex({ locale: "zh", countries: [mexico] }))).toEqual([{ type: "country", entry: mexico }]);
  });
});

// The home page's index, built the way the page builds it, from the real data.
const heartland = loadHeartland();
const allCultures = loadCultures().map(toSearchEntry);
function homeIndex(locale: Locale) {
  const wars = loadWars(locale);
  return searchIndex({
    locale,
    countries: countrySearchEntries(countryCodes(heartland, wars), locale),
    cultures: allCultures,
    wars: warSearchEntries(wars, locale),
    allCountryPages: true,
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
    ["en", "mongal", "country:MN"],
    ["en", "maian", "culture:maya"],
    ["en", "uk", "country:GB"],
    ["en", "usa", "country:US"],
    ["en", "england", "country:GB"],
    ["en", "great britain", "country:GB"],
    ["en", "britain", "country:GB"],
    ["en", "america", "country:US"],
    ["en", "holland", "country:NL"],
    ["en", "turkey", "country:TR"],
    ["en", "qing chao", "culture:qing"],
    ["en", "ching dynasty", "culture:qing"],
    ["en", "ching", "culture:qing"],
    ["en", "spane", "country:ES"],
    ["en", "world war 2", "war:world-war-ii"],
    ["en", "world war two", "war:world-war-ii"],
    ["en", "ww ii", "war:world-war-ii"],
    ["en", "wolrd war 2", "war:world-war-ii"],
    ["en", "world war 1", "war:world-war-i"],
    ["en", "world war one", "war:world-war-i"],
    ["en", "3 kingdoms", "culture:three-kingdoms"],
    ["en", "hann", "culture:han"],
    ["en", "mayas", "culture:maya"],
    ["en", "afghn", "country:AF"],
    ["en", "afghna", "country:AF"],
    ["en", "viet nam", "country:VN"],
    ["en", "indo china war", "war:first-indochina-war"],
    ["en", "greeks", "culture:ancient-greece"],
    ["en", "mochay", "culture:moche"],
    ["en", "deutschland", "country:DE"],
    ["en", "swiss", "country:CH"],
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
    ["es", "aztecas", "culture:aztec"],
    ["es", "mayas", "culture:maya"],
    ["es", "cultura maya", "culture:maya"],
    ["es", "grecia antigua", "culture:ancient-greece"],
    ["zh", "中国", "country:CN"],
    ["zh", "越南", "country:VN"],
    ["zh", "阿兹特克", "culture:aztec"],
    ["zh", "mexcio", "country:MX"],
    ["zh", "qing chao", "culture:qing"],
    ["zh", "qingchao", "culture:qing"],
    ["zh", "hanchao", "culture:han"],
    ["zh", "qinchao", "culture:qin"],
    ["zh", "zhongguo", "country:CN"],
  ])("%s: %s -> %s", (locale, query, expected) => {
    expect(labels(query, locale)[0]).toBe(expected);
  });
});

describe("names the reader sees, against the real data", () => {
  it.each<Locale>(["en", "es", "zh"])("%s: a typo of a country's name finds it first, whatever the page's language", (locale) => {
    // Through words inside other names: "Anglo-Chinese War", "Invasión rusa de Ucrania".
    expect(labels("chine", locale)[0]).toBe("country:CN");
    expect(labels("russa", locale)[0]).toBe("country:RU");
    expect(labels("greeco", locale)).toContain("country:GR");
  });

  it("finds the country, not only what a hidden word inside another name starts", () => {
    expect(labels("mongola", "en")[0]).toBe("country:MN");
    for (const locale of ["en", "zh"] as const) expect(labels("germani", locale)).toContain("country:DE");
    for (const locale of ["es", "zh"] as const) expect(labels("spani", locale)).toContain("country:ES");
  });

  it("counts a Chinese civilisation's pinyin as seen, so it forgives two edits", () => {
    // "Chunqiu" is the Spring and Autumn period's pinyin; its name on the row is 春秋时期 or an English one.
    expect(labels("chunquio", "zh")[0]).toBe("culture:spring-and-autumn");
  });

  it("asks only a Chinese civilisation's aliases whether they are pinyin", () => {
    // "Tula", "Nile" and "luoma" split into pinyin syllables too, as do "Taliban" and "Tailandia".
    const seenIn = (id: string) => indexes.en.items.find((r) => r.item.type === "culture" && r.item.entry.id === id)?.terms.filter((t) => t.seen === "latin").map((t) => t.text);
    // On an English page the English name is shown, so only pinyin is left to be seen in Latin letters.
    expect(seenIn("toltec")).toEqual([]);
    expect(seenIn("rome")).toEqual([]);
    expect(seenIn("three-kingdoms")).toEqual(expect.arrayContaining(["sanguo", "san guo"]));
  });

  it("finds what a whole word inside an alias names, after the names the reader sees", () => {
    // Through "Russian invasion of Ukraine", "Russia–Ukraine war", "Empire of Charlemagne", "US–Mexico War",
    // "Conquest of Peru", "First China War" and "Eastern Zhou (early)".
    expect(labels("invasion of ukraine", "en")[0]).toBe("war:russo-ukrainian-war-2022");
    expect(labels("ukraine war", "en")).toContain("war:russo-ukrainian-war");
    expect(labels("charlemagne", "en")[0]).toBe("culture:carolingian-empire");
    expect(labels("ukraine", "en")[0]).toBe("country:UA");
    expect(labels("ukraine", "en")).toEqual(expect.arrayContaining(["war:russo-ukrainian-war", "war:russo-ukrainian-war-2022"]));
    for (const [q, code, war] of [["mexico", "MX", "mexican-american-war"], ["peru", "PE", "spanish-conquest-of-the-inca-empire"], ["china", "CN", "first-opium-war"]]) {
      expect(labels(q, "en")[0], q).toBe(`country:${code}`);
      expect(labels(q, "en"), q).toContain(`war:${war}`);
    }
    expect(labels("zhou", "en")).toContain("culture:spring-and-autumn");
  });

  it("finds Rome by its people, in English and Spanish", () => {
    expect(labels("romans", "en")[0]).toBe("culture:rome");
    expect(labels("romans", "en")).toContain("culture:holy-roman-empire");
    const picker = searchIndex({ locale: "es", cultures: allCultures });
    for (const q of ["romano", "romanos"]) {
      for (const hits of [labels(q, "es"), search(q, picker).map(label)]) {
        // The Holy Roman Empire's Spanish name, on the row, says "Romano"; Rome's alias "Imperio romano" doesn't show.
        expect(hits.indexOf("culture:holy-roman-empire"), q).toBe(0);
        expect(hits, q).toContain("culture:rome");
      }
    }
  });

  it("brings nothing through two edits or a vowel allowance on a name the reader never sees", () => {
    expect(labels("polaco", "es")).not.toContain("war:second-opium-war");
    for (const unrelated of ["country:TH", "war:war-in-afghanistan-2001", "culture:aztec", "war:world-war-ii"]) expect(labels("italian", "en")).not.toContain(unrelated);
    expect(labels("colonial", "en")).not.toContain("country:PL");
    expect(labels("russian", "zh")).not.toContain("culture:etruscan");
  });
});

describe("false positives", () => {
  const termsOf = (locale: Locale, hit: SearchHit) => indexes[locale].items.find((r) => r.item === hit)?.terms.map((t) => t.text) ?? [];
  const hitsWhoseTerms = (query: string, test: (term: string) => boolean) =>
    search(query, indexes.en).filter((hit) => !termsOf("en", hit).some(test)).map(label);

  it("finds only names with the word in them for 'war'", () => {
    expect(search("war", indexes.en).length).toBeGreaterThan(0);
    expect(hitsWhoseTerms("war", (t) => t.includes("war"))).toEqual([]);
  });

  it("finds a two-letter query only at a word start in the name shown, or as a whole code or alias", () => {
    const shownOrWhole = (q: string) => (hit: SearchHit) => {
      const shown = hit.type === "culture" ? (hit.entry.name.en ?? "") : hit.type === "year" ? "" : hit.entry.name;
      return new RegExp(`(^|[^\\p{L}])${q}`, "iu").test(shown) || termsOf("en", hit).includes(q);
    };
    for (const q of ["in", "ma", "de", "la", "co"]) {
      const hits = search(q, indexes.en);
      expect(hits.length).toBeGreaterThan(0);
      expect(hits.filter((hit) => !shownOrWhole(q)(hit)).map(label)).toEqual([]);
    }
    // Through "Inglaterra" and "Corea del Norte", names an English page never shows.
    expect(labels("in", "en")).not.toContain("country:GB");
    expect(labels("co", "en")).not.toContain("country:KP");
  });

  it("answers a bare year with the year alone, and puts a year ahead of names", () => {
    expect(labels("1500", "en").filter((l) => !l.startsWith("year:"))).toEqual([]);
    expect(labels("1453", "en")[0]).toBe("year:1453");
    expect(labels("1453", "en")).toContain("war:fall-of-constantinople");
  });

  it("brings no near-namesake when a name is spelled right", () => {
    expect(labels("iran", "en")).not.toContain("country:IQ");
    expect(labels("iran", "en")).not.toContain("war:iraq-war");
    expect(labels("inca", "en")).not.toContain("country:IN");
    expect(labels("iran", "en")[0]).toBe("country:IR");
    expect(labels("iran", "en")).toContain("war:iran-iraq-war");
    expect(labels("usa", "en")[0]).toBe("country:US");
    expect(labels("usa", "en")).not.toContain("war:russo-ukrainian-war-2022");
    expect(labels("korea", "en")).not.toContain("war:third-anglo-maratha-war");
    expect(labels("netherland", "en")[0]).toBe("country:NL");
    expect(labels("netherland", "en")).not.toContain("war:korean-war");
    expect(labels("aztecas", "es")).not.toContain("war:peloponnesian-war");
    expect(labels("qing chao", "en")).not.toContain("culture:ming");
  });

  it("answers the name of a place the site doesn't cover with nothing, not a neighbour", () => {
    for (const q of ["taiwan", "taiwa", "tiawan", "tawian", "chile", "oman", "hong kong", "ottoman"]) expect(labels(q, "en")).toEqual([]);
    for (const q of ["birmania", "imperio otomano", "otomano", "otomanos"]) expect(labels(q, "es")).toEqual([]);
    for (const q of ["taiwan", "tiawan"]) expect(labels(q, "zh")).toEqual([]);
  });

  // The wars list and the compare picker list only some places; a country they leave out may still have a page.
  it("blocks typos on the wars list and in the compare picker only for the places never shown", () => {
    const wars = loadWars("en");
    const warsList = searchIndex({ locale: "en", countries: countryIndex(wars, "en"), wars: warSearchEntries(wars, "en") });
    // "angol" matched unlisted Angola, so none of the Anglo wars appeared.
    expect(search("angol", warsList).map(label)).toContain("war:first-anglo-mysore-war");
    expect(search("tiawan", warsList)).toEqual([]);
    const picker = (locale: Locale) => searchIndex({ locale, cultures: allCultures });
    // Through Oman and Romania, which the picker never lists.
    for (const q of ["ooman", "ruman"]) expect(search(q, picker("en")).map(label)).toContain("culture:holy-roman-empire");
    expect(search("romani", picker("es")).map(label)).toContain("culture:holy-roman-empire");
  });

  it("lists on the wars page every country with the typed letters anywhere in its name, from three letters", () => {
    // "stan" listed Afghanistan, Pakistan and the rest before the search forgave typos, and nothing after.
    const wars = loadWars("en");
    const countries = countryIndex(wars, "en");
    const warsList = searchIndex({ locale: "en", countries, wars: warSearchEntries(wars, "en"), countryInside: true });
    for (const q of ["stan", "land"]) {
      const want = countries.filter((c) => c.name.toLowerCase().includes(q)).map((c) => `country:${c.code}`);
      expect(want.length).toBeGreaterThan(1);
      expect(search(q, warsList).map(label)).toEqual(expect.arrayContaining(want));
    }
    // Only there: the home page still matches Latin letters only at the start of a word.
    expect(labels("stan", "en")).not.toContain("country:AF");
  });

  it("builds no country names for an index without countries but the places never shown", () => {
    const unlisted = searchIndex({ locale: "en", cultures: allCultures }).unlisted.map((t) => t.text);
    expect(unlisted).toContain("taiwan");
    expect(unlisted).not.toContain("angola");
  });

  it("puts names the reader sees ahead of aliases they start", () => {
    // The Korean War is found by its alias "Inchon"; the Inca by the names on their rows.
    const hits = labels("inc", "en");
    const at = (label: string) => {
      expect(hits).toContain(label);
      return hits.indexOf(label);
    };
    expect(at("culture:inca")).toBeLessThan(at("war:spanish-conquest-of-the-inca-empire"));
    expect(at("war:spanish-conquest-of-the-inca-empire")).toBeLessThan(at("war:korean-war"));
  });

  it("never fuzzes CJK", () => {
    expect(labels("中困", "zh")).toEqual([]);
  });

  it("keeps 'America' to English pages", () => {
    // In Spanish "América" is the continent.
    for (const q of ["america", "américa"]) expect(labels(q, "es")).not.toContain("country:US");
    expect(labels("america", "en")[0]).toBe("country:US");
  });

  it("finds a country by its everyday names on every page", () => {
    // Keyed by the page's language, these found nothing on Spanish and Chinese pages.
    for (const locale of ["es", "zh"] as const) {
      for (const [q, code] of [["usa", "US"], ["uk", "GB"], ["england", "GB"], ["deutschland", "DE"], ["swiss", "CH"], ["britain", "GB"]]) {
        expect(labels(q, locale)[0], `${locale} ${q}`).toBe(`country:${code}`);
      }
    }
    expect(labels("zhongguo", "en")[0]).toBe("country:CN");
    expect(labels("inglaterra", "en")[0]).toBe("country:GB");
  });

  it("never offers a country or war the page's language has no page for", () => {
    for (const locale of ["es", "zh"] as const) {
      expect(labels("ukraine", locale)).not.toContain("country:UA");
      expect(labels("korean war", locale)).not.toContain("war:korean-war");
    }
    expect(labels("ukraine", "en")).toContain("country:UA");
  });
});
