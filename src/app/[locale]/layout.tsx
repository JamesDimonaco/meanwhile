import { Analytics } from "@vercel/analytics/next";
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

const FOOTER_LINK =
  "inline-flex min-h-11 items-center rounded-md px-3 font-medium underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none";

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
    manifest: `/${locale}/manifest.webmanifest`,
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
        <Analytics />
        <NextIntlClientProvider>
          <ExplainerProvider>
            <a
              href="#main"
              className="sr-only focus-visible:not-sr-only focus-visible:absolute focus-visible:start-3 focus-visible:top-3 focus-visible:z-50 focus-visible:rounded-lg focus-visible:bg-primary focus-visible:px-4 focus-visible:py-3 focus-visible:text-sm focus-visible:font-medium focus-visible:text-primary-foreground"
            >
              {t("skipToContent")}
            </a>
            <header className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 px-3 py-1.5 sm:px-4">
              <Link
                href="/"
                className="inline-flex min-h-11 items-center rounded-md px-1 font-semibold focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                {t("appName")}
              </Link>
              <div className="ms-auto flex items-center whitespace-nowrap sm:gap-1">
                <ScanButton variant="header" />
                <ExplainerTrigger />
                <LanguageSwitcher gaps={gapsOnPagesIn(loadLocaleGaps(), locale)} />
              </div>
            </header>
            <main id="main" tabIndex={-1} className="flex-1 px-4 pb-12 focus:outline-none">{children}</main>
            <footer className="border-t border-border px-2 py-2 text-sm">
              <nav aria-label={t("appName")} className="flex flex-wrap justify-center gap-x-2">
                <Link href="/" prefetch={false} className={FOOTER_LINK}>
                  {t("nav.home")}
                </Link>
                <Link href="/timeline" className={FOOTER_LINK}>
                  {t("nav.timeline")}
                </Link>
                <Link href="/wars" className={FOOTER_LINK}>
                  {t("nav.wars")}
                </Link>
                <Link href="/credits" prefetch={false} className={FOOTER_LINK}>
                  {t("nav.credits")}
                </Link>
              </nav>
            </footer>
          </ExplainerProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
