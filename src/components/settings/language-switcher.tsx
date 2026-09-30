"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { LOCALES, LOCALE_STORAGE_KEY, type Locale } from "@/i18n/locales";

function remember(locale: Locale) {
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // Storage unavailable: the choice still applies via the URL.
  }
}

/**
 * One tap to switch — reachable everywhere, no menu to open on weak signal.
 * Keeps the query string, so the timeline stays on its ?year=.
 */
export function LanguageSwitcher() {
  // useSearchParams needs a Suspense boundary in a prerendered page. The static
  // HTML gets the same links without the query until hydration fills it in.
  return (
    <Suspense fallback={<LanguageLinks search="" />}>
      <LanguageLinksWithSearch />
    </Suspense>
  );
}

function LanguageLinksWithSearch() {
  const query = useSearchParams().toString();
  return <LanguageLinks search={query ? `?${query}` : ""} />;
}

function LanguageLinks({ search }: { search: string }) {
  const t = useTranslations("common");
  const current = useLocale();
  const pathname = usePathname();
  return (
    <nav aria-label={t("language")} className="flex items-center gap-1 text-sm">
      {LOCALES.map((locale, i) => (
        <span key={locale} className="flex items-center gap-1">
          {i > 0 && <span aria-hidden className="text-muted-foreground">·</span>}
          <Link
            href={`${pathname}${search}`}
            locale={locale}
            lang={locale}
            aria-current={locale === current ? "true" : undefined}
            onClick={() => remember(locale)}
            className={
              locale === current
                ? "rounded-md px-1.5 py-1 font-medium text-foreground"
                : "rounded-md px-1.5 py-1 text-muted-foreground hover:text-foreground"
            }
          >
            {new Intl.DisplayNames([locale], { type: "language" }).of(locale)}
          </Link>
        </span>
      ))}
    </nav>
  );
}
