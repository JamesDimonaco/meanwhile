import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { YearRangeText, YearText } from "./year-text";

vi.mock("next-intl", () => ({ useLocale: () => "en", useTranslations: () => (key: string) => key }));
vi.mock("@/components/explainer/explainer-provider", () => ({
  claimFirstBCEAutoOpen: () => false,
  useExplainer: () => ({ open: () => {}, close: () => {} }),
}));
vi.mock("./use-settings", () => ({ useSettings: () => ({ eraStyle: "ce", showYearsAgo: false }) }));

describe("dates", () => {
  it("are buttons that open the explainer when they stand alone", () => {
    expect(renderToStaticMarkup(createElement(YearText, { year: -1199 }))).toMatch(/<button[^>]*>1200[\s\u00a0]BCE<\/button>/);
    expect(renderToStaticMarkup(createElement(YearRangeText, { start: 1, end: 100 }))).toContain("<button");
  });

  // A button inside a link or a <summary> is invalid, and steals the tap meant for the card.
  it("are plain text inside a link, a summary or another button", () => {
    const year = renderToStaticMarkup(createElement(YearText, { year: -1199, plain: true }));
    const range = renderToStaticMarkup(createElement(YearRangeText, { start: 1, end: 100, plain: true }));
    expect(year).toMatch(/1200[\s\u00a0]BCE/);
    expect(year + range).not.toContain("<button");
  });

  it("are at least 24px tall as buttons", () => {
    expect(renderToStaticMarkup(createElement(YearText, { year: 5 }))).toMatch(/class="[^"]*\bmin-h-6\b/);
  });
});
