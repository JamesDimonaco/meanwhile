import { describe, expect, it, vi } from "vitest";
import { NEVER_SHOWN } from "@/lib/data/countries";
import { generateMetadata, generateStaticParams } from "./page";

vi.mock("next-intl/server", () => ({
  setRequestLocale: () => {},
  getTranslations: async () => (key: string, values?: Record<string, string>) => `${key}${values ? JSON.stringify(values) : ""}`,
}));
// next-intl's navigation can't load outside Next; metadata never renders a Link.
vi.mock("@/i18n/navigation", () => ({ Link: () => null }));

const codes = (locale: string) => generateStaticParams({ params: { locale } }).map((p) => p.code);

describe("country pages", () => {
  it.each(["en", "es", "zh"])("never exist for a disputed or politically loaded code in %s", (locale) => {
    for (const code of NEVER_SHOWN) expect(codes(locale)).not.toContain(code.toLowerCase());
  });

  it("exist for a civilisation's country with no war, and for a war's country with no civilisation", () => {
    for (const locale of ["en", "es", "zh"]) {
      expect(codes(locale)).toContain("pe");
      expect(codes(locale)).toContain("vn");
    }
  });

  // South Korea's only war is the Korean War, behind the review gate in es and zh.
  it("exist only in English for a country whose only entries are gated wars", () => {
    expect(codes("en")).toContain("kr");
    expect(codes("es")).not.toContain("kr");
    expect(codes("zh")).not.toContain("kr");
  });

  it("titles the page with the country's name and keeps hreflang to the languages it exists in", async () => {
    const meta = await generateMetadata({ params: Promise.resolve({ locale: "en", code: "kr" }), searchParams: Promise.resolve({}) });
    expect(meta.title).toBe('title{"country":"South Korea"}');
    expect(Object.keys(meta.alternates?.languages ?? {})).toEqual(["en", "x-default"]);
    expect(meta.openGraph?.images).toEqual([expect.objectContaining({ url: "/en/opengraph-image/" })]);
  });
});
