import { describe, expect, it } from "vitest";
import { rank, toTerms } from "./match";

/** Each name is its own item with that one term, so a test reads as "query against these names". */
const find = (query: string, names: readonly string[]) => rank(query, names.map((n) => ({ item: n, terms: toTerms([n]) })));

describe("rank: real matches", () => {
  it("returns nothing for a blank query", () => {
    expect(find("  ", ["Inca"])).toEqual([]);
  });

  it("ranks exact, then prefix, then a word inside, then a substring", () => {
    expect(find("inca", ["Vinca", "Inca Empire", "Imperio inca", "Inca"])).toEqual(["Inca", "Inca Empire", "Imperio inca", "Vinca"]);
  });

  it("ignores case and accents", () => {
    expect(find("mexico", ["MÉXICO"])).toEqual(["MÉXICO"]);
    expect(find("zhou", ["Zhōu"])).toEqual(["Zhōu"]);
  });

  it("keeps items with equal scores in the order given", () => {
    expect(find("egypt", ["Egypt", "egypt"])).toEqual(["Egypt", "egypt"]);
  });

  it("matches CJK anywhere in a term", () => {
    expect(find("中国", ["第二次中国战争", "中国"])).toEqual(["中国", "第二次中国战争"]);
  });

  it("matches a one- or two-letter query only at the start of a word, never inside one", () => {
    expect(find("in", ["Argentina", "War in Afghanistan", "India"])).toEqual(["India", "War in Afghanistan"]);
    expect(find("ma", ["Denmark", "Maya"])).toEqual(["Maya"]);
  });
});

describe("rank: typos", () => {
  it("counts swapped neighbours as one edit", () => {
    expect(find("mexcio", ["Mexico"])).toEqual(["Mexico"]);
    expect(find("untied states", ["United States"])).toEqual(["United States"]);
  });

  it("allows no edit up to three letters", () => {
    expect(find("wae", ["War"])).toEqual([]);
    expect(find("tnag", ["Tang"])).toEqual(["Tang"]);
  });

  it("allows one edit from four to six letters, two from seven", () => {
    expect(find("egpt", ["Egypt"])).toEqual(["Egypt"]);
    expect(find("mongal", ["Mongol"])).toEqual(["Mongol"]);
    expect(find("mangal", ["Mongol"])).toEqual([]);
    expect(find("vietman", ["Vietnam"])).toEqual(["Vietnam"]);
    expect(find("vaetman", ["Vietnam"])).toEqual([]);
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

  it("ranks a misspelling of the whole name above one of a word in it, and that above a half-typed one", () => {
    expect(find("vietman", ["Vietnam War", "Vietnamese", "Vietnam"])).toEqual(["Vietnam", "Vietnam War", "Vietnamese"]);
  });

  it("ranks fewer edits first", () => {
    expect(find("vietnem", ["Vaetnam", "Vietnam"])).toEqual(["Vietnam", "Vaetnam"]);
    expect(find("vietnem", ["Vaetnam", "Vietnam War"])).toEqual(["Vietnam War", "Vaetnam"]);
  });

  it("never ranks a typo above a real prefix or substring hit", () => {
    expect(find("opium", ["Opiom", "Second Opium War"])).toEqual(["Second Opium War", "Opiom"]);
  });

  it("drops typo matches when something matched exactly", () => {
    expect(find("iran", ["Iraq", "Iran", "Iran–Iraq War"])).toEqual(["Iran", "Iran–Iraq War"]);
  });

  it("never fuzzes CJK or digits", () => {
    expect(find("中困", ["中国"])).toEqual([]);
    expect(find("1435", ["1453"])).toEqual([]);
  });
});
