import { describe, expect, it } from "vitest";
import { LOCALES } from "@/i18n/locales";
import { loadCultures } from "@/lib/data/load";
import sitemap from "./sitemap";

describe("sitemap", () => {
  const rows = sitemap();
  const cultureCount = loadCultures().length;

  it("covers every culture in every locale, plus home/timeline/credits", () => {
    const expected = (3 + cultureCount) * LOCALES.length;
    expect(rows).toHaveLength(expected);
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

  it("gives every row's own URL a place in its own alternates (self-referencing, as Google recommends)", () => {
    for (const row of rows) {
      const languages = row.alternates?.languages as Record<string, string>;
      expect(Object.values(languages)).toContain(row.url);
    }
  });
});
