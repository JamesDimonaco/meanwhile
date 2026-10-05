import { describe, expect, it } from "vitest";
import { jsonLd, pageAlternates, SITE_URL, websiteJsonLd } from "./seo";

describe("pageAlternates", () => {
  it("sends x-default to the root language chooser for the home page only", () => {
    expect(pageAlternates("es", "").languages["x-default"]).toBe("/");
    expect(pageAlternates("es", "credits").languages["x-default"]).toBe("/en/credits/");
  });
});

describe("websiteJsonLd", () => {
  // The domain root's WebSite block is the one Google reads for the site name above each result.
  it("names the site after the app and points at the site root", () => {
    const site = websiteJsonLd("Meanwhile");
    expect(site.name).toBe("Meanwhile");
    expect(site.url).toBe(`${SITE_URL}/`);
    expect(site["@id"]).toBe(`${SITE_URL}/#website`);
  });
});

describe("jsonLd", () => {
  it("escapes < so no string in the data can close the script tag", () => {
    const out = jsonLd({ name: "</script><script>alert(1)</script>" });
    expect(out).not.toContain("<");
    expect(JSON.parse(out)).toEqual({ name: "</script><script>alert(1)</script>" });
  });
});
