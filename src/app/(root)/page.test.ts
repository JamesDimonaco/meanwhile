import type { Messages, NamespaceKeys } from "next-intl";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { Locale } from "@/i18n/locales";
import RootRedirect from "./page";

vi.mock("next-intl/server", async () => {
  const { createTranslator } = await import("next-intl");
  const { loadMessages } = await import("@/i18n/messages");
  return {
    getTranslations: async ({ locale, namespace }: { locale: Locale; namespace: NamespaceKeys<Messages, string> }) =>
      createTranslator({ locale, messages: await loadMessages(locale), namespace }),
  };
});

describe("the root page", () => {
  // "/" is the installed app's start URL: on weak signal a visible list would show on every launch until the redirect lands.
  it("shows the language links to no-JS visitors only", async () => {
    const html = renderToStaticMarkup(await RootRedirect());
    const outside = html.replace(/<noscript>.*?<\/noscript>/gs, "");
    expect(html).toContain('href="/es/"');
    expect(outside).not.toContain("<a ");
  });
});
