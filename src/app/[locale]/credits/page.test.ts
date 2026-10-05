import type { Messages, NamespaceKeys } from "next-intl";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { Locale } from "@/i18n/locales";
import { loadAllWars } from "@/lib/data/load";
import CreditsPage from "./page";

vi.mock("next-intl/server", async () => {
  const { createTranslator } = await import("next-intl");
  const { loadMessages } = await import("@/i18n/messages");
  return {
    setRequestLocale: () => {},
    getTranslations: async ({ locale, namespace }: { locale: Locale; namespace: NamespaceKeys<Messages, string> }) =>
      createTranslator({ locale, messages: await loadMessages(locale), namespace }),
  };
});

async function jsonLdBlocks(locale: Locale): Promise<string[]> {
  const html = renderToStaticMarkup(await CreditsPage({ params: Promise.resolve({ locale }), searchParams: Promise.resolve({}) }));
  return [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map((m) => m[1] ?? "");
}

describe("credits page Dataset JSON-LD", () => {
  // One entry for Dataset Search, not three locale copies.
  it("is on the English credits page only", async () => {
    const [block, ...rest] = await jsonLdBlocks("en");
    expect(rest).toHaveLength(0);
    expect(JSON.parse(block ?? "")).toMatchObject({ "@type": "Dataset" });
    expect(await jsonLdBlocks("es")).toEqual([]);
    expect(await jsonLdBlocks("zh")).toEqual([]);
  });

  // The review gate: a gated war's id or name must never reach es/zh output, so the block lists no war at all.
  it("names no war, by id or in any language", async () => {
    const [block = ""] = await jsonLdBlocks("en");
    for (const war of loadAllWars()) {
      expect(block).not.toContain(war.id);
      for (const name of Object.values(war.name)) expect(block).not.toContain(name);
    }
  });
});
