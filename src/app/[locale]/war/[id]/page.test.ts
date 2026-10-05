import { describe, expect, it, vi } from "vitest";
import { generateMetadata } from "./page";

vi.mock("next-intl/server", () => ({
  setRequestLocale: () => {},
  getTranslations: async () => Object.assign((key: string) => key, { markup: (key: string) => key }),
}));
// next-intl's navigation can't load outside Next; metadata never renders a Link.
vi.mock("@/i18n/navigation", () => ({ Link: () => null }));

// Without a trailing slash, next.config's trailingSlash 308s the share image,
// and some link-preview crawlers don't follow the redirect.
describe("war page metadata", () => {
  it("puts the dates in the title and leads the description with name, dates and outcome", async () => {
    const meta = await generateMetadata({
      params: Promise.resolve({ locale: "en", id: "korean-war" }),
      searchParams: Promise.resolve({}),
    });
    expect(meta.title).toEqual({ absolute: "Korean War (1950–1953\u00a0CE)" });
    expect(meta.description).toMatch(/^Korean War, 1950–1953\u00a0CE\. An armistice/);
  });

  it("names its share image with a trailing slash and the war's name as alt", async () => {
    const meta = await generateMetadata({
      params: Promise.resolve({ locale: "en", id: "korean-war" }),
      searchParams: Promise.resolve({}),
    });
    expect(meta.openGraph?.images).toEqual([
      expect.objectContaining({ url: "/en/war/korean-war/opengraph-image/", alt: "Korean War" }),
    ]);
  });
});
