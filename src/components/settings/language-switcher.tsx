"use client";

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

/** Stub: ui-core owns the final design. Must keep writing LOCALE_STORAGE_KEY. */
export function LanguageSwitcher() {
  const t = useTranslations("common");
  const current = useLocale();
  const pathname = usePathname();
  return (
    <nav aria-label={t("language")} className="flex gap-2 text-sm">
      {LOCALES.map((locale) => (
        <Link
          key={locale}
          href={pathname}
          locale={locale}
          lang={locale}
          aria-current={locale === current ? "true" : undefined}
          onClick={() => remember(locale)}
        >
          {new Intl.DisplayNames([locale], { type: "language" }).of(locale)}
        </Link>
      ))}
    </nav>
  );
}
