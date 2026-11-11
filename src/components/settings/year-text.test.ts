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
  it("are buttons that open the explainer where a page asks for it", () => {
    expect(renderToStaticMarkup(createElement(YearText, { year: -1199, explain: true }))).toMatch(/<button[^>]*>1200[\s\u00a0]BCE<\/button>/);
    expect(renderToStaticMarkup(createElement(YearRangeText, { start: 1, end: 100, explain: true }))).toContain("<button");
  });

  // A button inside a link or a <summary> is invalid, and steals the tap meant for the card: so text is
  // what a call site gets when it says nothing.
  it("are plain text by default", () => {
    const year = renderToStaticMarkup(createElement(YearText, { year: -1199 }));
    const range = renderToStaticMarkup(createElement(YearRangeText, { start: 1, end: 100 }));
    expect(year).toMatch(/1200[\s\u00a0]BCE/);
    expect(year + range).not.toContain("<button");
  });

  it("are at least 24px tall as buttons", () => {
    expect(renderToStaticMarkup(createElement(YearText, { year: 5, explain: true }))).toMatch(/class="[^"]*\bmin-h-6\b/);
  });
});
