import { createTranslator } from "next-intl";
import { describe, expect, it } from "vitest";
import { loadMessages } from "@/i18n/messages";
import { loadCultures, loadWars } from "@/lib/data/load";
import { datasetJsonLd, jsonLd, openGraph, pageAlternates, SITE_URL, websiteJsonLd } from "./seo";

describe("openGraph", () => {
  const image = { path: "" as const, alt: "Who Was When" };

  it("lists every other locale as an alternate by default", () => {
    expect(openGraph("en", "Who Was When", image).alternateLocale).toEqual(["es", "zh-Hans"]);
  });

  it("lists only the locales the page exists in, for a page the review gate hides", () => {
    expect(openGraph("en", "Who Was When", image, ["en"]).alternateLocale).toEqual([]);
    expect(openGraph("es", "Who Was When", image, ["en", "es"]).alternateLocale).toEqual(["en"]);
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
    const site = websiteJsonLd("Who Was When");
    expect(site.name).toBe("Who Was When");
    expect(site.url).toBe(`${SITE_URL}/`);
    expect(site["@id"]).toBe(`${SITE_URL}/#website`);
  });

  // The site was called Meanwhile until October 2026.
  it("keeps the old name as an alternate, so a search for it still finds the site", () => {
    expect(websiteJsonLd("Who Was When").alternateName).toEqual(["Meanwhile"]);
  });
});

describe("jsonLd", () => {
  it("escapes < so no string in the data can close the script tag", () => {
    const out = jsonLd({ name: "</script><script>alert(1)</script>" });
    expect(out).not.toContain("<");
    expect(JSON.parse(out)).toEqual({ name: "</script><script>alert(1)</script>" });
  });
});

const t = createTranslator({ locale: "en", messages: await loadMessages("en"), namespace: "credits" });

describe("datasetJsonLd", () => {
  const cultures = loadCultures();
  const wars = loadWars("en");
  const dataset = datasetJsonLd(
    {
      name: t("datasetName", { appName: "Who Was When" }),
      keywords: t("datasetKeywords"),
      description: (values) => t("datasetDescription", values),
    },
    cultures,
    wars,
  );

  // Google drops a Dataset whose description is outside 50 to 5000 characters.
  it("describes the data in 50 to 5000 characters, with the counts from the loaded data", () => {
    expect(dataset.description.length).toBeGreaterThanOrEqual(50);
    expect(dataset.description.length).toBeLessThanOrEqual(5000);
    expect(dataset.description).toContain(`${cultures.length} civilisations and ${wars.length} wars`);
    expect(dataset.description).toContain("from 4100\u00a0BCE to the present");
  });

  // es/zh text falls back to English where it is missing, and the gated wars are English only.
  it("doesn't claim every record is in all three languages", () => {
    expect(dataset.description).not.toContain("in English, Spanish and Simplified Chinese");
    expect(dataset.description).toContain("most of it also in Spanish and Simplified Chinese");
  });

  it("takes its name and keywords from the credits messages", () => {
    expect(dataset.name).toBe("Who Was When: dated civilisations and wars");
    expect(dataset.keywords).toBe("history, chronology, civilisations, dynasties, wars, timeline");
  });

  it("names the CC BY 4.0 licence and where to get the data", () => {
    expect(dataset["@type"]).toBe("Dataset");
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
