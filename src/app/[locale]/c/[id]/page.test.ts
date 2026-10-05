import type { Messages, NamespaceKeys } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import type { Locale } from "@/i18n/locales";
import { cultureTitle } from "@/lib/data/culture-copy";
import { loadCulture } from "@/lib/data/load";
import { generateMetadata } from "./page";

vi.mock("next-intl/server", async () => {
  const { createTranslator } = await import("next-intl");
  const { loadMessages } = await import("@/i18n/messages");
  return {
    setRequestLocale: () => {},
    getTranslations: async ({ locale, namespace }: { locale: Locale; namespace: NamespaceKeys<Messages, string> }) =>
      createTranslator({ locale, messages: await loadMessages(locale), namespace }),
  };
});
// next-intl's navigation can't load outside Next; metadata never renders a Link.
vi.mock("@/i18n/navigation", () => ({ Link: () => null }));

// Without a trailing slash, next.config's trailingSlash 308s the share image,
// and some link-preview crawlers don't follow the redirect.
describe("culture page metadata", () => {
  const meta = (locale: Locale, id: string) =>
    generateMetadata({ params: Promise.resolve({ locale, id }), searchParams: Promise.resolve({}) });

  // No " · Meanwhile": search results cut a title at about 60 characters, and the site name shows above the result anyway.
  it("titles a culture with its dates and the 'at the same time' wording people search with, without the app name", async () => {
    expect((await meta("en", "shang")).title).toEqual({ absolute: "Shang dynasty (1500–1050\u00a0BCE): the world at the same time" });
    expect((await meta("es", "egypt")).title).toEqual({ absolute: expect.stringMatching(/\): el mundo al mismo tiempo$/) });
  });

  it("drops the wording when a long name would push the title past 60 characters", async () => {
    expect((await meta("en", "zapotec")).title).toEqual({ absolute: "Zapotec civilization (700\u00a0BCE – 1521\u00a0CE)" });
  });

  // The native name costs title length and isn't what people search with; the share image's alt keeps it.
  it("leaves the native name out of the title", async () => {
    expect((await meta("en", "shang")).title).toEqual({ absolute: expect.not.stringContaining("商") });
    expect((await meta("es", "inca")).title).toEqual({ absolute: expect.not.stringContaining("Tawantinsuyu") });
  });

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
