import { describe, expect, it } from "vitest";
import { openGraph } from "./seo";

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
