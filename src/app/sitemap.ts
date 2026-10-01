import type { MetadataRoute } from "next";
import { DEFAULT_LOCALE, HTML_LANG, LOCALES, type Locale } from "@/i18n/locales";
import { loadCultures, loadWars } from "@/lib/data/load";
import { localeGaps, warCountryCodes } from "@/lib/data/wars";
import { absoluteUrl, localePath, type SeoPath } from "@/lib/seo";

// Built once per deploy: nothing here changes between requests.
export const dynamic = "force-static";

/** Every page path, locale-free: the root redirect has no content of its own, so it's excluded. */
function paths(): SeoPath[] {
  const wars = loadWars();
  return [
    "",
    "timeline",
    "credits",
    ...loadCultures().map((c) => `c/${c.id}` as const),
    "wars",
    ...warCountryCodes(wars).map((code) => `wars/${code.toLowerCase()}` as const),
    ...wars.map((w) => `war/${w.id}` as const),
  ];
}

/**
 * One row per locale a path exists in (the review gate keeps some wars out
 * of es/zh), each carrying the reciprocal hreflang set (Google wants every
 * row self-listed too).
 */
function rows(path: SeoPath, locales: readonly Locale[]): MetadataRoute.Sitemap {
  const languages = Object.fromEntries(locales.map((l) => [HTML_LANG[l], absoluteUrl(localePath(l, path))]));
  languages["x-default"] = absoluteUrl(localePath(DEFAULT_LOCALE, path));
  return locales.map((locale) => ({ url: absoluteUrl(localePath(locale, path)), alternates: { languages } }));
}

export default function sitemap(): MetadataRoute.Sitemap {
  const gaps = localeGaps(loadWars());
  return paths().flatMap((path) => rows(path, gaps[`/${path}`] ?? LOCALES));
}
