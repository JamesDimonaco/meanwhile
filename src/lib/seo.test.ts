import { describe, expect, it } from "vitest";
import { loadCultures, loadWars } from "@/lib/data/load";
import { datasetJsonLd, jsonLd, openGraph, pageAlternates, SITE_URL, websiteJsonLd } from "./seo";

describe("openGraph", () => {
  const image = { path: "" as const, alt: "Meanwhile" };

  it("lists every other locale as an alternate by default", () => {
    expect(openGraph("en", "Meanwhile", image).alternateLocale).toEqual(["es", "zh-Hans"]);
  });

  it("lists only the locales the page exists in, for a page the review gate hides", () => {
    expect(openGraph("en", "Meanwhile", image, ["en"]).alternateLocale).toEqual([]);
    expect(openGraph("es", "Meanwhile", image, ["en", "es"]).alternateLocale).toEqual(["en"]);
  });
});

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

describe("datasetJsonLd", () => {
  const cultures = loadCultures();
  const wars = loadWars("en");
  const dataset = datasetJsonLd("Meanwhile", cultures, wars);

  // Google drops a Dataset whose description is outside 50 to 5000 characters.
  it("describes the data in 50 to 5000 characters, with the counts from the loaded data", () => {
    expect(dataset.description.length).toBeGreaterThanOrEqual(50);
    expect(dataset.description.length).toBeLessThanOrEqual(5000);
    expect(dataset.description).toContain(`${cultures.length} civilisations and ${wars.length} wars`);
    expect(dataset.description).toContain("from 4100\u00a0BCE to the present");
  });

  it("names the CC BY 4.0 licence and where to get the data", () => {
    expect(dataset["@type"]).toBe("Dataset");
    expect(dataset.name).toBe("Meanwhile: dated civilisations and wars");
    expect(dataset.license).toBe("https://creativecommons.org/licenses/by/4.0/");
    expect(dataset.isAccessibleForFree).toBe(true);
    expect(dataset.url).toBe(`${SITE_URL}/en/credits/`);
    expect(dataset.sameAs).toBe("https://github.com/JamesDimonaco/meanwhile/tree/main/data");
    expect(dataset.distribution).toEqual([
      {
        "@type": "DataDownload",
        encodingFormat: "application/zip",
        contentUrl: "https://github.com/JamesDimonaco/meanwhile/archive/refs/heads/main.zip",
      },
    ]);
  });

  // ISO 8601 years are astronomical like the data's, so 4100 BCE is -4099; two wars are still going on.
  it("covers the earliest year in the data to an open end, as an ISO 8601 interval", () => {
    expect(dataset.temporalCoverage).toBe("-4099/..");
  });

  // Google's guidelines want markup to match what the page shows, and the credits page names no author.
  it("names no creator", () => {
    expect(dataset).not.toHaveProperty("creator");
  });
});
