import { describe, expect, it, vi } from "vitest";
import { cultureTitle } from "@/lib/data/culture-copy";
import { loadCulture } from "@/lib/data/load";
import { generateMetadata } from "./page";

vi.mock("next-intl/server", () => ({
  setRequestLocale: () => {},
  getTranslations: async () => (key: string) => key,
}));
// next-intl's navigation can't load outside Next; metadata never renders a Link.
vi.mock("@/i18n/navigation", () => ({ Link: () => null }));

// Without a trailing slash, next.config's trailingSlash 308s the share image,
// and some link-preview crawlers don't follow the redirect.
describe("culture page metadata", () => {
  it("names its share image with a trailing slash and the page title as alt", async () => {
    const meta = await generateMetadata({
      params: Promise.resolve({ locale: "es", id: "rome" }),
      searchParams: Promise.resolve({}),
    });
    expect(meta.openGraph?.images).toEqual([
      expect.objectContaining({ url: "/es/c/rome/opengraph-image/", alt: cultureTitle(loadCulture("rome"), "es") }),
    ]);
  });
});
