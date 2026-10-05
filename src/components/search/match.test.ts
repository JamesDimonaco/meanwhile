import { describe, expect, it } from "vitest";
import { isPinyin, rank, toTerms } from "./match";

/** Each name is its own item with that one shown term, so a test reads as "query against these names". */
const find = (query: string, names: readonly string[]) => rank(query, names.map((n) => ({ item: n, terms: toTerms({ shown: [n] }) })));

describe("rank: real matches", () => {
  it("returns nothing for a blank query", () => {
    expect(find("  ", ["Inca"])).toEqual([]);
  });

  it("ranks exact, then prefix, then a word inside", () => {
    expect(find("inca", ["Imperio inca", "Inca Empire", "Inca"])).toEqual(["Inca", "Inca Empire", "Imperio inca"]);
  });

  it("never matches Latin text in the middle of a word, at any length", () => {
    // "Srirangapatna" brought the Fourth Anglo-Mysore War to "iran".
    expect(find("inc", ["Vinca"])).toEqual([]);
    expect(find("rang", ["Srirangapatna"])).toEqual([]);
    expect(find("iran", ["Srirangapatna"])).toEqual([]);
  });

  it("ignores case and accents", () => {
    expect(find("mexico", ["MEXICO"])).toEqual(["MEXICO"]);
    // Three letters have no typo budget, so only stripping the tone mark can match these.
    expect(find("han", ["Hàn"])).toEqual(["Hàn"]);
    expect(find("qin", ["Qín cháo"])).toEqual(["Qín cháo"]);
  });

  it("ranks any hit on the name the reader sees, short of exact, above one on a term they don't", () => {
    // "inc" put the Korean War, through its alias "Inchon", above the conquest of the Inca Empire.
    const items = [
      { item: "Korean War", terms: toTerms({ shown: ["Korean War"], other: ["Inchon"] }) },
      { item: "Conquest of the Inca Empire", terms: toTerms({ shown: ["Conquest of the Inca Empire"] }) },
    ];
    expect(rank("inc", items)).toEqual(["Conquest of the Inca Empire", "Korean War"]);
    expect(rank("korea", items)).toEqual(["Korean War"]);
  });

  it("keeps items with equal scores in the order given", () => {
    expect(find("egypt", ["Egypt", "egypt"])).toEqual(["Egypt", "egypt"]);
  });

  it("matches CJK anywhere in a term, from one character", () => {
    expect(find("中国", ["第二次中国战争", "中国"])).toEqual(["中国", "第二次中国战争"]);
    expect(find("国", ["中国"])).toEqual(["中国"]);
  });

  it("matches words typed apart or together, or with letters doubled, as if typed right", () => {
    expect(find("viet nam", ["Vietnam"])).toEqual(["Vietnam"]);
    expect(find("qingchao", ["Qing chao"])).toEqual(["Qing chao"]);
    expect(find("ching", ["Ch'ing"])).toEqual(["Ch'ing"]);
    // "Han" is exact once doubled letters are folded, so it beats a real prefix.
    expect(find("hann", ["Hannibal", "Han"])).toEqual(["Han", "Hannibal"]);
    expect(find("ww ii", ["WWII"])).toEqual(["WWII"]);
    // Typed apart and half typed: "Vietnam War" run together starts with "vietnamw".
    expect(find("viet nam w", ["Vietnam War"])).toEqual(["Vietnam War"]);
    expect(find("eeuu", ["EEUU", "Iron Age Europe"])).toEqual(["EEUU"]);
    // One typed word never runs on into the next word of a name.
    expect(find("warinuk", ["War in Ukraine"])).toEqual([]);
    expect(find("romman", ["Ancient Rome", "Holy Roman Empire", "Roman"])).toEqual(["Roman", "Holy Roman Empire"]);
  });

  it("but never folds a word of three letters or fewer", () => {
    expect(find("inn", ["In"])).toEqual([]);
    expect(find("world war ii", ["World War I", "World War II"])).toEqual(["World War II"]);
  });

  it("matches a one- or two-letter query against the shown name, and other terms only whole", () => {
    // On an English page "de" found Korea through "Corea del Norte", which the reader never sees.
    const items = [
      { item: "KP", terms: toTerms({ shown: ["North Korea"], other: ["KP", "Corea del Norte"] }) },
      { item: "DK", terms: toTerms({ shown: ["Denmark"], other: ["DK", "Dinamarca"] }) },
      { item: "DE", terms: toTerms({ shown: ["Germany"], other: ["DE", "Alemania"] }) },
    ];
    expect(rank("de", items)).toEqual(["DE", "DK"]);
    expect(rank("co", items)).toEqual([]);
    expect(rank("cor", items)).toEqual(["KP"]);
  });

  it("matches a one- or two-letter query only at the start of a word, never inside one", () => {
    expect(find("in", ["Argentina", "War in Afghanistan", "India"])).toEqual(["India", "War in Afghanistan"]);
    expect(find("ma", ["Denmark", "Maya"])).toEqual(["Maya"]);
  });
});

describe("rank: names the reader sees come first", () => {
  const korean = { item: "Korean War", terms: toTerms({ shown: ["Korean War"], other: ["Chinese People's Volunteer Army", "Inchon"] }) };
  const china = { item: "China", terms: toTerms({ shown: ["China"] }) };

  it("finds a term the reader doesn't see by its start or a whole word inside it, never by part of a word inside", () => {
    expect(rank("chinese", [korean])).toEqual(["Korean War"]);
    // "charlemagne" found the Carolingian Empire through "Empire of Charlemagne" until words inside hidden terms were dropped.
    expect(rank("volunteer", [korean])).toEqual(["Korean War"]);
    expect(rank("volunteer army", [korean])).toEqual(["Korean War"]);
    expect(rank("volun", [korean])).toEqual([]);
    expect(rank("people volunteer", [korean])).toEqual([]);
  });

  it("ranks a one-edit typo of a name the reader sees above any hit on a term they don't, short of exact", () => {
    // "chine" put the Korean War first, through "Chinese People's Volunteer Army".
    expect(rank("chine", [korean, china])).toEqual(["China", "Korean War"]);
    expect(rank("inchon", [korean, china])).toEqual(["Korean War"]);
  });

  it("gives a term the reader doesn't see one edit at most, from its start, with no allowance for vowels", () => {
    const poland = { item: "Poland", terms: toTerms({ shown: ["Poland"], other: ["Polonia"] }) };
    expect(rank("polonai", [poland])).toEqual(["Poland"]);
    // Two edits: "colonial" found Poland through "Polonia".
    expect(rank("colonial", [poland])).toEqual([]);
    expect(rank("pulonea", [poland])).toEqual([]);
    // Consonants alike: "russian" found the Etruscans through "Rasenna".
    expect(rank("russian", [{ item: "Etruscans", terms: toTerms({ shown: ["Etruscan civilization"], other: ["Rasenna"] }) }])).toEqual([]);
    // A word inside: "polaco" found the Second Opium War through "Old Summer Palace".
    expect(rank("palce", [{ item: "Second Opium War", terms: toTerms({ shown: ["Second Opium War"], other: ["Old Summer Palace"] }) }])).toEqual([]);
  });

  it("counts the English name as seen when the query is in Latin letters", () => {
    // On a Chinese page the rows show 中国 and 第一次鸦片战争; "chine" found only the war, through "Anglo-Chinese War".
    const zhChina = { item: "China", terms: toTerms({ shown: ["中国"], latin: ["China"] }) };
    const zhOpium = { item: "First Opium War", terms: toTerms({ shown: ["第一次鸦片战争"], latin: ["First Opium War"], other: ["Anglo-Chinese War"] }) };
    expect(rank("chine", [zhOpium, zhChina])).toEqual(["China"]);
    expect(rank("opium", [zhOpium, zhChina])).toEqual(["First Opium War"]);
    // One or two letters still search only the name on the row.
    expect(rank("ch", [zhOpium, zhChina])).toEqual([]);
  });
});

describe("rank: anywhere inside a word", () => {
  const inside = (names: readonly string[]) => names.map((n) => ({ item: n, terms: toTerms({ shown: [n], inside: true }) }));

  it("matches inside a word of a name the reader sees from three letters, below a prefix or a word start", () => {
    expect(rank("stan", inside(["Pakistan", "Stanley"]))).toEqual(["Stanley", "Pakistan"]);
    expect(rank("land", inside(["Poland", "Thailand"]))).toEqual(["Poland", "Thailand"]);
    expect(rank("an", inside(["Pakistan"]))).toEqual([]);
  });

  it("but never inside a term the reader doesn't see", () => {
    expect(rank("stan", [{ item: "PK", terms: toTerms({ shown: ["巴基斯坦"], other: ["Pakistan"], inside: true }) }])).toEqual([]);
  });
});

describe("isPinyin", () => {
  it("is true when every word splits into pinyin syllables, tone marks or not", () => {
    for (const text of ["Zhongguo", "Hàn cháo", "luoma", "gu aiji", "Wei Shu Wu", "Erlitou", "Xiongnu", "Qīng cháo"]) expect(isPinyin(text), text).toBe(true);
  });

  it("is false for other names", () => {
    for (const text of ["Manchu dynasty", "Inca", "Rome", "Koregaon", "Daicing Gurun", "Ch'ing", "Deutschland", "中国", "1453"]) expect(isPinyin(text), text).toBe(false);
  });
});

describe("rank: typos", () => {
  it("counts swapped neighbours as one edit", () => {
    expect(find("mexcio", ["Mexico"])).toEqual(["Mexico"]);
    expect(find("untied states", ["United States"])).toEqual(["United States"]);
  });

  it("lets a word whose consonants all agree hold one edit over its budget, in its vowels", () => {
    expect(find("spane", ["Spanish conquest", "Spain"])).toEqual(["Spain", "Spanish conquest"]);
    expect(find("mochay", ["Moche"])).toEqual(["Moche"]);
    expect(find("spake", ["Spain"])).toEqual([]);
    // Only from five letters, of about the same length, with three consonants to agree.
    expect(find("meia", ["Maya"])).toEqual([]);
    expect(find("sung", ["Sanguo"])).toEqual([]);
    expect(find("frnace", ["Faraonic"])).toEqual([]);
    expect(find("rusia", ["Ruso"])).toEqual([]);
    expect(find("fransia", ["Faraones"])).toEqual([]);
    expect(find("chna", ["Chin"])).toEqual([]);
    // Both words from five letters: "chine" found the Spring and Autumn period through "Chun Qiu".
    expect(find("chine", ["Chun Qiu"])).toEqual([]);
    // One edit over, not two.
    expect(find("spane", ["Speoine"])).toEqual([]);
    // The first letter counts even when it is a vowel: past it, "oztic" has Aztec's consonants, but starts differently.
    expect(find("oztic", ["Aztec"])).toEqual([]);
  });

  it("allows no edit up to three letters", () => {
    expect(find("wae", ["War"])).toEqual([]);
    expect(find("tnag", ["Tang"])).toEqual(["Tang"]);
  });

  it("allows one edit from four to six letters, two from seven", () => {
    expect(find("egpt", ["Egypt"])).toEqual(["Egypt"]);
    expect(find("mongal", ["Mongol"])).toEqual(["Mongol"]);
    expect(find("mondal", ["Mongol"])).toEqual([]);
    expect(find("vietman", ["Vietnam"])).toEqual(["Vietnam"]);
    expect(find("vaetman", ["Vietnam"])).toEqual([]);
  });

  it("counts the budget from the shorter of the two words", () => {
    // Two edits make a six-letter word into another word, however long the typed one:
    // "otomanos" (Ottomans) found the Spring and Autumn period through "Otoños".
    expect(find("otomanos", ["Primaveras y los Otoños"])).toEqual([]);
    expect(find("otomano", ["Imperio romano"])).toEqual([]);
    expect(find("vietman", ["Vietnam War"])).toEqual(["Vietnam War"]);
  });

  it("forgives doubled or missing double letters and ph for f at no cost to the budget", () => {
    expect(find("chinna", ["China"])).toEqual(["China"]);
    expect(find("peloponesian", ["Peloponnesian War"])).toEqual(["Peloponnesian War"]);
    expect(find("fillipines", ["Philippines"])).toEqual(["Philippines"]);
    expect(find("fillipinnes", ["Philippines"])).toEqual(["Philippines"]);
    expect(find("filip", ["Philip II"])).toEqual(["Philip II"]);
  });

  it("but never on a word of three letters or fewer", () => {
    expect(find("inn", ["War in Afghanistan"])).toEqual([]);
    // "hann" folds to "han": three letters, so no edit left to reach "San".
    expect(find("hann", ["San Lorenzo", "Han dynasty"])).toEqual(["Han dynasty"]);
  });

  it("matches a misspelled word inside a longer name", () => {
    expect(find("azteck", ["Aztec Empire"])).toEqual(["Aztec Empire"]);
  });

  it("matches a half-typed misspelling from five letters", () => {
    expect(find("mexci", ["Mexico"])).toEqual(["Mexico"]);
    expect(find("peleop", ["Peloponnesian War"])).toEqual(["Peloponnesian War"]);
    expect(find("meri", ["Mexico"])).toEqual([]);
  });

  it("matches a multi-word query word by word, in order", () => {
    expect(find("opiom war", ["First Opium War"])).toEqual(["First Opium War"]);
    expect(find("war opiom", ["First Opium War"])).toEqual([]);
    expect(find("opiom wae", ["First Opium War"])).toEqual([]);
  });

  it("still forgives the words of a query that has a number in it", () => {
    expect(find("wolrd war 2", ["World War 2"])).toEqual(["World War 2"]);
    expect(find("world war 3", ["World War 2"])).toEqual([]);
  });

  it("ranks a misspelling of the whole name above one of a word in it or a half-typed one", () => {
    expect(find("vietman", ["Vietnam War", "Vietnamese", "Vietnam"])).toEqual(["Vietnam", "Vietnam War", "Vietnamese"]);
  });

  it("ranks a misspelt word in a name and a half-typed one alike, so the order given decides", () => {
    // Typing "afghanistan" flipped the top hit between the country and the Soviet–Afghan War.
    expect(find("afghn", ["Afghanistan", "Soviet–Afghan War"])).toEqual(["Afghanistan", "Soviet–Afghan War"]);
  });

  it("ranks fewer edits first", () => {
    expect(find("vietnem", ["Vietnan", "Vietnam"])).toEqual(["Vietnam", "Vietnan"]);
    expect(find("vietnem", ["Vietnan", "Vietnam War"])).toEqual(["Vietnam War", "Vietnan"]);
  });

  it("never ranks a typo above a real prefix or substring hit", () => {
    expect(find("opium", ["Opiom", "Second Opium War"])).toEqual(["Second Opium War", "Opiom"]);
  });

  it("drops typo matches when something matched exactly", () => {
    expect(find("iran", ["Iraq", "Iran", "Iran–Iraq War"])).toEqual(["Iran", "Iran–Iraq War"]);
  });

  it("keeps only typos of a name the reader sees when something else matched for real", () => {
    const maratha = { item: "Third Anglo-Maratha War", terms: toTerms({ shown: ["Third Anglo-Maratha War"], other: ["Koregaon"] }) };
    const korea = [maratha, { item: "North Korea", terms: toTerms({ shown: ["North Korea"] }) }];
    expect(rank("korea", korea)).toEqual(["North Korea"]);
    expect(rank("koregoan", [maratha])).toEqual(["Third Anglo-Maratha War"]);
    expect(rank("korean", [{ item: "Korean War", terms: toTerms({ shown: ["Korean War"] }) }, ...korea])).toEqual(["Korean War", "North Korea"]);
  });

  it("never fuzzes CJK or digits", () => {
    expect(find("中困", ["中国"])).toEqual([]);
    expect(find("1435", ["1453"])).toEqual([]);
  });

  it("counts the name of a place the site doesn't list as a match it never returns", () => {
    const thailand = [{ item: "Thailand", terms: toTerms({ shown: ["Thailand"], other: ["Tailandia"] }) }];
    const unlisted = toTerms({ shown: ["Taiwan"] });
    expect(rank("taiwan", thailand, unlisted)).toEqual([]);
    expect(rank("taiwa", thailand, unlisted)).toEqual([]);
    expect(rank("tailanda", thailand, unlisted)).toEqual(["Thailand"]);
  });

  it("returns nothing for a misspelt unlisted place, unless a listed name is at least as close", () => {
    // "tiawan" is one swap from Taiwan; it found Tiwanaku as a half-typed typo.
    const tiwanaku = [{ item: "Tiwanaku", terms: toTerms({ shown: ["Tiwanaku"] }) }];
    const unlisted = toTerms({ shown: ["Taiwan"] });
    expect(rank("tiawan", tiwanaku, unlisted)).toEqual([]);
    expect(rank("tiwanak", tiwanaku, unlisted)).toEqual(["Tiwanaku"]);
    // As close: one edit from both.
    expect(rank("kali", [{ item: "Mali", terms: toTerms({ shown: ["Mali"] }) }], toTerms({ shown: ["Bali"] }))).toEqual(["Mali"]);
  });

  it("measures how close in edits, whether or not the reader sees the term", () => {
    // On a Spanish page "holanda" is one edit from the alias Holland, two from Irlanda, a country with no page.
    const netherlands = [{ item: "NL", terms: toTerms({ shown: ["Países Bajos"], other: ["Holland"] }) }];
    expect(rank("holanda", netherlands, toTerms({ shown: ["Irlanda"] }))).toEqual(["NL"]);
  });
});
