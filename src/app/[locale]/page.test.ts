import type { Messages, NamespaceKeys } from "next-intl";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { Locale } from "@/i18n/locales";
import HomePage, { generateMetadata } from "./page";

type Namespace = NamespaceKeys<Messages, string>;

vi.mock("next-intl/server", async () => {
  const { createTranslator } = await import("next-intl");
  const { loadMessages } = await import("@/i18n/messages");
  // The page's bare getTranslations("home") reads the locale pageLocale set, as next-intl's does.
  let requestLocale: Locale = "en";
  return {
    setRequestLocale: (locale: Locale) => {
      requestLocale = locale;
    },
    getTranslations: async (arg: Namespace | { locale: Locale; namespace: Namespace }) => {
      const { locale, namespace } = typeof arg === "string" ? { locale: requestLocale, namespace: arg } : arg;
      return createTranslator({ locale, messages: await loadMessages(locale), namespace });
    },
  };
});
// next-intl's navigation and the client components below can't render outside Next; the heading tests read none of them.
vi.mock("@/i18n/navigation", () => ({ Link: () => null }));
vi.mock("@/components/scan/scan-button", () => ({ ScanButton: () => null }));
vi.mock("@/components/search/search-box", () => ({ SearchBox: () => null }));
vi.mock("@/components/search/search-from-url", () => ({ SearchFromUrl: () => null }));
vi.mock("@/components/filters/region-filtered-list", () => ({ RegionFilteredList: () => null }));
vi.mock("@/components/context/records-strip", () => ({ RecordsStrip: () => null }));

const meta = (locale: Locale) => generateMetadata({ params: Promise.resolve({ locale }), searchParams: Promise.resolve({}) });

// The home title was just the app name in every language, so no search words matched it.
describe("home page metadata", () => {
  it("titles the page with what the site answers, then the app name", async () => {
    expect((await meta("en")).title).toEqual({ absolute: "What else was happening in the world at the same time · Who Was When" });
    expect((await meta("zh")).title).toEqual({ absolute: "同一时间，世界上还发生着什么 · 同时代" });
  });

  it("names the app in Spanish pages as Who Was When", async () => {
    expect((await meta("es")).title).toMatchObject({ absolute: expect.stringMatching(/ · Who Was When$/) });
  });
});

// whowaswhen.com has to match what a zh visitor sees the page call itself, so the zh home names the site in English too.
describe("home page heading", () => {
  const visibleText = async (locale: Locale) =>
    renderToStaticMarkup(await HomePage({ params: Promise.resolve({ locale }), searchParams: Promise.resolve({}) })).replace(
      /<script[\s\S]*?<\/script>/g,
      "",
    );

  it("shows the English name in English under the zh name", async () => {
    const html = await visibleText("zh");
    expect(html).toContain(">同时代</h1>");
    expect(html).toMatch(/<p lang="en"[^>]*>Who Was When<\/p>/);
  });

  it("names the site once on pages already in its English name", async () => {
    expect((await visibleText("en")).match(/Who Was When/g)).toHaveLength(1);
    expect((await visibleText("es")).match(/Who Was When/g)).toHaveLength(1);
  });
});
