import type { Messages, NamespaceKeys } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import type { Locale } from "@/i18n/locales";
import { loadMessages } from "@/i18n/messages";
import { generateMetadata } from "./layout";

vi.mock("next-intl/server", async () => {
  const { createTranslator } = await import("next-intl");
  const { loadMessages } = await import("@/i18n/messages");
  return {
    getTranslations: async ({ locale, namespace }: { locale: Locale; namespace: NamespaceKeys<Messages, string> }) =>
      createTranslator({ locale, messages: await loadMessages(locale), namespace }),
  };
});

describe("the root page's metadata", () => {
  // A shared link to "/" should preview the same as one to /en/.
  it("carries the English home page's description", async () => {
    expect((await generateMetadata()).description).toBe((await loadMessages("en")).home.metaDescription);
  });
});
