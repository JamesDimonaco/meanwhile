import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { ExplainerProvider } from "@/components/explainer/explainer-provider";
import { ExplainerTrigger } from "@/components/explainer/explainer-trigger";
import { RegisterServiceWorker } from "@/components/pwa/register-service-worker";
import { ScanButton } from "@/components/scan/scan-button";
import { LanguageSwitcher } from "@/components/settings/language-switcher";
import { HTML_LANG } from "@/i18n/locales";
import { Link } from "@/i18n/navigation";
import { pageLocale } from "@/i18n/page-locale";
import { routing } from "@/i18n/routing";
import { loadLocaleGaps } from "@/lib/data/load";
import { gapsOnPagesIn } from "@/lib/data/country";
import { openGraph, SITE_URL } from "@/lib/seo";
import "../globals.css";

export const dynamicParams = false;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const locale = await pageLocale(params);
  const t = await getTranslations({ locale, namespace: "common" });
  return {
    // Every other page overrides title/description/alternates with its own
    // content; this is only the fallback and the base every relative URL
    // (canonical, OG images) resolves against.
    metadataBase: new URL(SITE_URL),
    title: { default: t("appName"), template: `%s · ${t("appName")}` },
    description: t("tagline"),
    appleWebApp: { capable: true, statusBarStyle: "default", title: t("appName") },
    openGraph: openGraph(locale, t("appName"), { path: "", alt: t("appName") }),
    twitter: { card: "summary_large_image" },
  };
}

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const locale = await pageLocale(params);
  const t = await getTranslations("common");

  return (
    <html lang={HTML_LANG[locale]} dir="ltr">
      <body className="flex min-h-dvh flex-col">
        <RegisterServiceWorker />
        <NextIntlClientProvider>
          <ExplainerProvider>
            <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 py-3">
              <Link href="/" className="font-semibold">
                {t("appName")}
              </Link>
              <div className="ms-auto flex items-center gap-2 whitespace-nowrap">
                <ScanButton variant="header" />
                <ExplainerTrigger />
                <LanguageSwitcher gaps={gapsOnPagesIn(loadLocaleGaps(), locale)} />
              </div>
            </header>
            <main className="flex-1 px-4 pb-8">{children}</main>
            <footer className="flex flex-wrap justify-center gap-x-6 gap-y-2 border-t border-border px-4 py-4 text-sm">
              <Link href="/timeline" className="underline-offset-2 hover:underline">
                {t("nav.timeline")}
              </Link>
              <Link href="/wars" className="underline-offset-2 hover:underline">
                {t("nav.wars")}
              </Link>
              <Link href="/credits" className="underline-offset-2 hover:underline">
                {t("nav.credits")}
              </Link>
            </footer>
          </ExplainerProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
