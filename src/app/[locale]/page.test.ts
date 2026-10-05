import type { Messages, NamespaceKeys } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import type { Locale } from "@/i18n/locales";
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

const meta = (locale: Locale) => generateMetadata({ params: Promise.resolve({ locale }), searchParams: Promise.resolve({}) });

// The home title was just "Meanwhile" in every language, so no search words matched it.
describe("home page metadata", () => {
  it("titles the page with what the site answers, then the app name", async () => {
    expect((await meta("en")).title).toEqual({ absolute: "What else was happening in the world at the same time · Meanwhile" });
    expect((await meta("zh")).title).toEqual({ absolute: "同一时间，世界上还发生着什么 · Meanwhile" });
  });
});
