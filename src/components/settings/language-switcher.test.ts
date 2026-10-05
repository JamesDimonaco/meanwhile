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
    createElement(NextIntlClientProvider, {
      locale: "en",
      timeZone: "UTC",
      messages: await loadMessages("en"),
      children: createElement(LanguageSwitcher, { gaps: {} }),
    }),
  );
  return [...html.matchAll(/<a [^>]*>[\s\S]*?<\/a>/g)].map(([a]) => a);
}

describe("the language switcher", () => {
  // "zh" alone doesn't say Simplified: the label carries the same tag as the page.
  it("tags each language's link with the page's html lang", async () => {
    expect((await links()).map((a) => a.match(/ lang="([^"]+)"/)?.[1])).toEqual(LOCALES.map((l) => HTML_LANG[l]));
  });

  // Each label is the language's own short name, the same on every page, so all three message files carry all three.
  it("labels each language with its short name from the messages", async () => {
    const shortNames = (await loadMessages("en")).common.languageShort;
    expect((await links()).map(visibleOnPhones)).toEqual(LOCALES.map((l) => shortNames[l]));
  });

  // WCAG 2.5.3: a voice user says what they see ("tap EN"), so the phone label must be in the link's name.
  it("keeps the phone label in the accessible name, with the full name after it", async () => {
    const [en, es] = await links();
    expect(en).not.toContain("aria-hidden");
    expect(textOf(en)).toBe("EN English");
    expect(textOf(es)).toBe("ES español");
  });

  it("writes 中文 once, where the short label is the full name", async () => {
    expect(textOf((await links())[2])).toBe("中文");
  });
});

function textOf(link: string): string {
  return link.replace(/<[^>]+>/g, "").trim();
}

/** The label a phone shows: everything but the sr-only full name (the short label is hidden from sm up). */
function visibleOnPhones(link: string): string {
  return textOf(link.replace(/<span class="[^"]*max-sm:sr-only[^"]*">[^<]*<\/span>/, ""));
}
