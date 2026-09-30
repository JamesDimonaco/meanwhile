import { describe, expect, it } from "vitest";
import { contemporaryNames, cultureDescription, cultureTitle, firstSentence, truncate } from "./culture-copy";
import type { Culture, Region } from "./schema";

const src = { citation: "Test source" };

function culture(id: string, region: Region, overrides: Partial<Culture> = {}): Culture {
  return {
    id,
    region,
    wikidataId: "Q1",
    name: { en: `${id} en`, zh: `${id}zh` },
    aliases: [],
    description: { en: `${id} first sentence. Second sentence is irrelevant here.` },
    reviewed: { es: false, zh: false },
    periods: [
      { id: "main", earliestStart: -200, latestStart: -100, earliestEnd: 100, latestEnd: 200, sources: [src], default: true, disputed: false },
    ],
    phases: [],
    events: [],
    facts: [],
    ...overrides,
  };
}

describe("firstSentence", () => {
  it("stops at the first terminal punctuation for Latin scripts", () => {
    expect(firstSentence("First bit. Second bit that should be dropped.", "en")).toBe("First bit.");
  });

  it("uses the Chinese full stop, not the Latin period, for zh", () => {
    // A Latin period inside a Wikidata id or similar shouldn't end a zh sentence early.
    expect(firstSentence("第一句包含v1.2版本号。第二句应被丢弃。", "zh")).toBe("第一句包含v1.2版本号。");
  });

  it("returns the whole string when there's no terminator", () => {
    expect(firstSentence("No terminator here", "en")).toBe("No terminator here");
  });
});

describe("truncate", () => {
  it("returns the text unchanged when it already fits", () => {
    expect(truncate("short", 20)).toBe("short");
  });

  it("cuts at a word boundary and adds an ellipsis when over budget", () => {
    const out = truncate("one two three four five six seven eight nine ten", 20);
    expect(out.length).toBeLessThanOrEqual(20);
    expect(out.endsWith("…")).toBe(true);
    expect(out).not.toMatch(/\s…$/); // no dangling space before the ellipsis
  });
});

describe("cultureTitle", () => {
  it("appends the native name in parentheses when present", () => {
    const c = culture("shang", "china", { nativeName: { text: "商", lang: "zh-Hans" } });
    expect(cultureTitle(c, "en")).toBe("shang en (商)");
  });

  it("uses full-width parentheses for zh", () => {
    const c = culture("shang", "china", { nativeName: { text: "商", lang: "zh-Hans" } });
    expect(cultureTitle(c, "zh")).toBe("shangzh（商）");
  });

  it("falls back to the plain name when there's no native name", () => {
    expect(cultureTitle(culture("shang", "china"), "en")).toBe("shang en");
  });
});

describe("cultureDescription", () => {
  it("leads with name, date range and the first sentence of the description, under the SEO budget", () => {
    const c = culture("shang", "china");
    const out = cultureDescription(c, "en");
    expect(out.startsWith("shang en")).toBe(true);
    expect(out).toContain("shang first sentence.");
    expect(out.length).toBeLessThanOrEqual(155);
  });

  it("never exceeds the ~155 character meta description budget even for a long single-sentence description", () => {
    // One long run-on sentence (a single terminator at the very end) so
    // firstSentence can't shorten it first: this exercises truncate's budget.
    const c = culture("qin", "china", { description: { en: `${"word ".repeat(60)}done.` } });
    expect(cultureDescription(c, "en").length).toBeLessThanOrEqual(155);
  });
});

describe("contemporaryNames", () => {
  it("returns up to `count` other cultures' localized names, never the culture itself", () => {
    const anchor = culture("shang", "china");
    const others = [
      culture("olmec", "mesoamerica"),
      culture("chavin", "south-america"),
      culture("minoan", "europe"),
      culture("erlitou", "china"),
    ];
    const names = contemporaryNames(anchor, [anchor, ...others], "en", 3);
    expect(names).toHaveLength(3);
    expect(names).not.toContain("shang en");
  });
});
