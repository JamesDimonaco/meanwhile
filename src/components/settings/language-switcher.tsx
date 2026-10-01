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

/** Pages that exist in some languages only (wars behind the review gate) -> the languages they exist in. */
type Gaps = Record<string, Locale[]>;

/**
 * One tap to switch — reachable everywhere, no menu to open on weak signal.
 * Keeps the query string, so the timeline stays on its ?year=. A page missing
 * in a language links to the wars list there instead of a 404.
 */
export function LanguageSwitcher({ gaps }: { gaps: Gaps }) {
  // useSearchParams needs a Suspense boundary in a prerendered page. The static
  // HTML gets the same links without the query until hydration fills it in.
  return (
    <Suspense fallback={<LanguageLinks search="" gaps={gaps} />}>
      <LanguageLinksWithSearch gaps={gaps} />
    </Suspense>
  );
}

function LanguageLinksWithSearch({ gaps }: { gaps: Gaps }) {
  const query = useSearchParams().toString();
  return <LanguageLinks search={query ? `?${query}` : ""} gaps={gaps} />;
}

function LanguageLinks({ search, gaps }: { search: string; gaps: Gaps }) {
  const t = useTranslations("common");
  const current = useLocale();
  const pathname = usePathname();
  const only = gaps[pathname.replace(/\/$/, "")];
  return (
    <nav aria-label={t("language")} className="flex items-center gap-1 text-sm">
      {LOCALES.map((locale, i) => (
        <span key={locale} className="flex items-center gap-1">
          {i > 0 && <span aria-hidden className="text-muted-foreground">·</span>}
          <Link
            href={only && !only.includes(locale) ? "/wars" : `${pathname}${search}`}
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
