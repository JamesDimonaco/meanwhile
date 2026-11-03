import { describe, expect, it } from "vitest";
import { LOCALES } from "@/i18n/locales";
import robots from "./robots";

describe("robots.txt", () => {
  // Compare reads ?ids= in the browser, so every pair of cultures is a new URL to a crawler and a
  // cache miss to Vercel. In November 2026 one SEO crawler fetched it 6,000 times in a few hours.
  it("keeps every crawler off the compare pages", () => {
    const { rules } = robots();
    const everyone = [rules].flat().find((r) => r.userAgent === "*");
    expect([everyone?.disallow].flat()).toEqual(expect.arrayContaining(LOCALES.map((l) => `/${l}/compare/`)));
  });
});
