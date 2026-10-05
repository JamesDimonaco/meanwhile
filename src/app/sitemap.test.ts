import { describe, expect, it, vi } from "vitest";
import { LOCALES } from "@/i18n/locales";
import { loadCultures, loadHeartland } from "@/lib/data/load";
import { withUnion } from "@/lib/data/nations";
import type { War } from "@/lib/data/war-schema";
import { SITE_URL } from "@/lib/seo";
import sitemap from "./sitemap";

// Two wars, one behind the review gate in es and zh: the sitemap must leave
// those pages out exactly where the build doesn't generate them.
vi.mock("@/lib/data/load", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/data/load")>();
  const t = (en: string) => ({ en });
  const war = (id: string, code: string, sensitive: boolean): War => ({
    id,
    wikidataId: "Q1",
    name: { en: id, es: id, zh: id },
    noWikiTitle: [],
    aliases: [],
    altNames: [],
    description: t("d"),
    outcome: t("o"),
    tier: "standard",
    sensitive,
    reviewed: { es: false, zh: false },
    period: { id: "p", earliestStart: 1900, latestStart: 1900, earliestEnd: 1901, latestEnd: 1901, sources: [], default: false, disputed: false },
    sides: [
      { id: "a", label: t("a"), members: [{ kind: "state", code, role: "belligerent", today: [code] }] },
      { id: "b", label: t("b"), members: [{ kind: "state", code: "MX", role: "belligerent", today: ["MX"] }] },
    ],
    phases: [],
    events: [],
    leaders: [],
    casualties: [],
    cultures: [],
    sources: [],
  });
  return { ...actual, loadAllWars: () => [war("open-war", "ES", false), war("gated-war", "KR", true)] };
});

describe("sitemap", () => {
  const rows = sitemap();
  const cultureCount = loadCultures().length;
  const urls = rows.map((r) => r.url);

  it("covers every culture in every locale, home/timeline/credits, the wars list and each country, minus what the review gate hides", () => {
    // Every heartland country (and the UK, through its nations) plus ES and MX (open-war), wars and
    // war/open-war everywhere; country/kr and war/gated-war in English only.
    const countries = new Set(withUnion([...Object.values(loadHeartland()).flat(), "ES", "MX"])).size;
    const expected = (3 + cultureCount + 2 + countries) * LOCALES.length + 2;
    expect(rows).toHaveLength(expected);
  });

  it("lists a gated war and its only country in English, and nowhere else", () => {
    expect(urls.filter((u) => u.includes("/war/gated-war/"))).toEqual([expect.stringContaining("/en/war/gated-war/")]);
    expect(urls.filter((u) => u.includes("/country/kr/"))).toEqual([expect.stringContaining("/en/country/kr/")]);
    expect(urls.filter((u) => u.includes("/war/open-war/"))).toHaveLength(LOCALES.length);
  });

  it("lists a country with a civilisation but no war in every locale, and no old wars/<code> page", () => {
    expect(urls.filter((u) => u.includes("/country/pe/"))).toHaveLength(LOCALES.length);
    expect(urls.filter((u) => /\/wars\/[a-z]{2}\//.test(u))).toEqual([]);
  });

  it("lists every culture id at least once", () => {
    const urls = rows.map((r) => r.url).join("\n");
    for (const culture of loadCultures()) {
      expect(urls).toContain(`/c/${culture.id}/`);
    }
  });

  it("gives every row a reciprocal hreflang set: every alternate points back to a URL that's itself in the sitemap", () => {
    const allUrls = new Set(rows.map((r) => r.url));
    for (const row of rows) {
      const languages = row.alternates?.languages as Record<string, string> | undefined;
      expect(languages).toBeDefined();
      for (const [lang, url] of Object.entries(languages!)) {
        if (lang === "x-default") continue; // x-default mirrors one locale's URL, not a distinct page
        expect(allUrls.has(url)).toBe(true);
      }
    }
  });

  // "/" is the language chooser, the URL Google designed x-default for; every other page has no such page, so English stands in.
  it("points the home page's x-default at the root, and every other page's at its English version", () => {
    const xDefault = (url: string) => (rows.find((r) => r.url === url)?.alternates?.languages as Record<string, string>)["x-default"];
    expect(xDefault(`${SITE_URL}/es/`)).toBe(`${SITE_URL}/`);
    expect(xDefault(`${SITE_URL}/es/timeline/`)).toBe(`${SITE_URL}/en/timeline/`);
  });

  it("gives every row's own URL a place in its own alternates (self-referencing, as Google recommends)", () => {
    for (const row of rows) {
      const languages = row.alternates?.languages as Record<string, string>;
      expect(Object.values(languages)).toContain(row.url);
    }
  });
});
