import { describe, expect, it } from "vitest";
import { contemporaryNames, cultureDescription, cultureTitle, firstSentence, truncate, warDescription, warYears } from "./culture-copy";
import type { Culture, Region } from "./schema";
import type { War } from "./war-schema";

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

  it("doesn't end a sentence inside an abbreviation such as the es era label", () => {
    // Five es war descriptions were cut to "En el 499 a." on the live site.
    expect(firstSentence("Roma y Cartago lucharon entre el 264 y el 146 a. e. c. La primera fue por Sicilia.", "es")).toBe(
      "Roma y Cartago lucharon entre el 264 y el 146 a. e. c.",
    );
    expect(firstSentence("En el 499 a. e. c. las ciudades jonias se rebelaron. Atenas envió barcos.", "es")).toBe(
      "En el 499 a. e. c. las ciudades jonias se rebelaron.",
    );
  });

  it("ends a sentence before an inverted question or exclamation mark (es)", () => {
    expect(firstSentence("Primera frase. ¿Segunda?", "es")).toBe("Primera frase.");
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

  it("leaves the native name out when the localized name already contains it", () => {
    const c = culture("shang", "china", { name: { en: "Shang dynasty", zh: "商朝" }, nativeName: { text: "商", lang: "zh-Hans" } });
    expect(cultureTitle(c, "zh")).toBe("商朝");
    expect(cultureTitle(c, "en")).toBe("Shang dynasty (商)");
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

  it("doesn't stack a second period after an era label that already ends in one (es)", () => {
    // es era labels ("a. e. c.") already end with a period.
    const c = culture("shang", "china", { description: { en: "n/a", es: "Primera frase. Segunda frase." } });
    expect(cultureDescription(c, "es")).not.toContain("..");
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

function war(overrides: Partial<War> = {}): War {
  const t = (en: string) => ({ en });
  return {
    id: "punic-wars",
    wikidataId: "Q1",
    name: { en: "Punic Wars", es: "Guerras púnicas", zh: "布匿战争" },
    noWikiTitle: [],
    aliases: [],
    altNames: [],
    description: t("d"),
    outcome: { en: "Rome destroyed Carthage.", es: "Roma destruyó Cartago.", zh: "罗马摧毁了迦太基。" },
    tier: "standard",
    sensitive: false,
    reviewed: { es: false, zh: false },
    period: { id: "p", earliestStart: -263, latestStart: -263, earliestEnd: -145, latestEnd: -145, sources: [src], default: false, disputed: false },
    sides: [],
    phases: [],
    events: [],
    leaders: [],
    casualties: [],
    cultures: [],
    sources: [],
    ...overrides,
  };
}

const ongoing = (start: string, date: string) => `${start} – ongoing, as of ${date}`;

describe("warYears", () => {
  it("formats an ended war's likely span as a year range", () => {
    expect(warYears(war(), "en", ongoing)).toBe("264–146\u00a0BCE");
  });

  it("words an ongoing war through the caller's ongoing message, with its start year and asOf date", () => {
    const w = war({
      period: undefined,
      ongoing: { earliestStart: 2022, latestStart: 2022, asOf: "2026-09-30", sources: [src], disputed: false },
    });
    expect(warYears(w, "en", ongoing)).toBe("2022\u00a0CE – ongoing, as of 30 September 2026");
  });
});

describe("warDescription", () => {
  it("is '<Name>, <years>. <outcome>' in en", () => {
    const w = war();
    expect(warDescription(w, "en", warYears(w, "en", ongoing))).toBe("Punic Wars, 264–146\u00a0BCE. Rome destroyed Carthage.");
  });

  it("doesn't stack a second period after the es era label", () => {
    const w = war();
    expect(warDescription(w, "es", warYears(w, "es", ongoing))).toBe(
      "Guerras púnicas, 264–146\u00a0a.\u00a0e.\u00a0c. Roma destruyó Cartago.",
    );
  });

  it("uses Chinese punctuation in zh", () => {
    const w = war();
    expect(warDescription(w, "zh", warYears(w, "zh", ongoing))).toBe("布匿战争，公元前264—前146年。罗马摧毁了迦太基。");
  });

  it("cuts to exactly the 155-character meta description budget", () => {
    // No spaces, so truncate can't stop early on a word boundary: the length is the budget itself.
    const w = war({ outcome: { en: "x".repeat(300) } });
    expect(warDescription(w, "en", "1 CE")).toHaveLength(155);
  });
});
