import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { ENGLISH_APP_NAME } from "@/i18n/app-name";
import { DEFAULT_LOCALE } from "@/i18n/locales";
import { openGraph, pageAlternates, SITE_URL } from "@/lib/seo";

// "/" is the URL people share, so it carries the English home page's description and share image.
export async function generateMetadata(): Promise<Metadata> {
  const tHome = await getTranslations({ locale: DEFAULT_LOCALE, namespace: "home" });
  return {
    metadataBase: new URL(SITE_URL),
    title: ENGLISH_APP_NAME,
    description: tHome("metaDescription"),
    openGraph: openGraph(DEFAULT_LOCALE, ENGLISH_APP_NAME, { path: "", alt: ENGLISH_APP_NAME }),
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
