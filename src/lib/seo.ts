import { DEFAULT_LOCALE, HTML_LANG, LOCALES, type Locale } from "@/i18n/locales";

// One env var, one fallback, used everywhere a full URL is needed
// (metadataBase, sitemap, robots). No trailing slash.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://meanwhile.dimonaco.co.uk").replace(/\/+$/, "");

/** Site-relative path for a page: "" (home) | "timeline" | "credits" | "c/shang". */
export type SeoPath = "" | "timeline" | "credits" | `c/${string}`;

/** Every page's URL, matching next.config's trailingSlash: true. */
export function localePath(locale: Locale, path: SeoPath): string {
  return path ? `/${locale}/${path}/` : `/${locale}/`;
}

export function absoluteUrl(pathname: string): string {
  return `${SITE_URL}${pathname}`;
}

/**
 * `alternates` for generateMetadata: canonical plus every locale's version of
 * the same page (hreflang), reciprocal by construction since every page
 * calls this with the same set of locales. x-default points at DEFAULT_LOCALE.
 */
export function pageAlternates(locale: Locale, path: SeoPath): { canonical: string; languages: Record<string, string> } {
  const languages: Record<string, string> = {};
  for (const l of LOCALES) languages[HTML_LANG[l]] = localePath(l, path);
  languages["x-default"] = localePath(DEFAULT_LOCALE, path);
  return { canonical: localePath(locale, path), languages };
}
