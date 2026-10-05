import { createElement, type AnchorHTMLAttributes } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import { HTML_LANG, LOCALES } from "@/i18n/locales";
import { loadMessages } from "@/i18n/messages";
import { LanguageSwitcher } from "./language-switcher";

vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams() }));
vi.mock("@/i18n/navigation", () => ({
  usePathname: () => "/",
  Link: ({ href, locale, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { locale: string }) =>
    createElement("a", { ...props, href: `/${locale}${String(href)}` }),
}));

async function links() {
  const html = renderToStaticMarkup(
    createElement(NextIntlClientProvider, { locale: "en", timeZone: "UTC", messages: await loadMessages("en") }, createElement(LanguageSwitcher, { gaps: {} })),
  );
  return [...html.matchAll(/<a [^>]*>[\s\S]*?<\/a>/g)].map(([a]) => a);
}

describe("the language switcher", () => {
  // "zh" alone doesn't say Simplified: the label carries the same tag as the page.
  it("tags each language's link with the page's html lang", async () => {
    expect((await links()).map((a) => a.match(/ lang="([^"]+)"/)?.[1])).toEqual(LOCALES.map((l) => HTML_LANG[l]));
  });
});
