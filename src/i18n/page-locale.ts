import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "./locales";

/**
 * Call first in every page, layout and generateMetadata under [locale]:
 * narrows the param to Locale and enables static rendering for next-intl.
 */
export async function pageLocale(params: Promise<{ locale: string }>): Promise<Locale> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  return locale;
}
