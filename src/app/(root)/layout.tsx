import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { DEFAULT_LOCALE } from "@/i18n/locales";
import { openGraph, pageAlternates, SITE_URL } from "@/lib/seo";

// "/" is the URL people share, so it carries the English home page's description and share image.
export async function generateMetadata(): Promise<Metadata> {
  const appName = (await getTranslations({ locale: DEFAULT_LOCALE, namespace: "common" }))("appName");
  const tHome = await getTranslations({ locale: DEFAULT_LOCALE, namespace: "home" });
  return {
    metadataBase: new URL(SITE_URL),
    title: appName,
    description: tHome("metaDescription"),
    openGraph: openGraph(DEFAULT_LOCALE, appName, { path: "", alt: appName }),
    alternates: { languages: pageAlternates(DEFAULT_LOCALE, "").languages },
  };
}

/** Bare root layout for the locale redirect page only; real pages live under [locale]. */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
