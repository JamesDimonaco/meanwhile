import type { Messages, NamespaceKeys } from "next-intl";
import type { MetadataRoute } from "next";
import { describe, expect, it, vi } from "vitest";
import { LOCALES, type Locale } from "@/i18n/locales";
import { loadMessages } from "@/i18n/messages";
import { generateMetadata } from "../layout";
import { GET, generateStaticParams } from "./route";

vi.mock("next-intl/server", async () => {
  const { createTranslator } = await import("next-intl");
  const { loadMessages } = await import("@/i18n/messages");
  return {
    setRequestLocale: () => {},
    getTranslations: async ({ locale, namespace }: { locale: Locale; namespace: NamespaceKeys<Messages, string> }) =>
      createTranslator({ locale, messages: await loadMessages(locale), namespace }),
  };
});
// The layout's header components need Next's router; its metadata reads none of them.
vi.mock("@/i18n/navigation", () => ({ Link: () => null, usePathname: () => "/" }));

async function manifest(locale: Locale): Promise<MetadataRoute.Manifest> {
  const response = await GET(new Request(`http://localhost/${locale}/manifest.webmanifest`), {
    params: Promise.resolve({ locale }),
  });
  return (await response.json()) as MetadataRoute.Manifest;
}

// iOS names the installed app from the page (appleWebApp.title, the locale's appName) and Android from the
// manifest, so each language needs its own manifest or the two disagree (同时代 on iOS, Who Was When on Android).
describe.each(LOCALES)("the %s manifest", (locale) => {
  it("names the installed app by the locale's appName", async () => {
    const { appName } = (await loadMessages(locale)).common;
    expect((await manifest(locale)).name).toBe(appName);
    expect((await manifest(locale)).short_name).toBe(appName);
  });

  // A home screen label cuts off at about 12 characters.
  it("keeps short_name short enough for a home screen label", async () => {
    expect((await manifest(locale)).short_name!.length).toBeLessThanOrEqual(12);
  });

  it("launches the installed app in the language it was installed in", async () => {
    expect((await manifest(locale)).start_url).toBe(`/${locale}/`);
  });

  it("is the manifest the locale's pages link", async () => {
    const meta = await generateMetadata({ params: Promise.resolve({ locale }) } as LayoutProps<"/[locale]">);
    expect(meta.manifest).toBe(`/${locale}/manifest.webmanifest`);
  });
});

it("is prerendered for every locale", () => {
  expect(generateStaticParams()).toEqual(LOCALES.map((locale) => ({ locale })));
});
