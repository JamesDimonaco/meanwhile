import type { Metadata } from "next";
import { DEFAULT_LOCALE, HTML_LANG, LOCALES, type Locale } from "@/i18n/locales";
import { OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og/theme";

// One env var, one fallback, used everywhere a full URL is needed
// (metadataBase, sitemap, robots). No trailing slash.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://meanwhile.dimonaco.co.uk").replace(/\/+$/, "");

/** Site-relative path for a page: "" (home) | "timeline" | "credits" | "c/shang" | "wars" | "wars/mx" | "war/korean-war". */
export type SeoPath = "" | "timeline" | "credits" | `c/${string}` | "wars" | `wars/${string}` | `war/${string}`;

/** Every page's URL, matching next.config's trailingSlash: true. */
export function localePath(locale: Locale, path: SeoPath): string {
  return path ? `/${locale}/${path}/` : `/${locale}/`;
}

export function absoluteUrl(pathname: string): string {
  return `${SITE_URL}${pathname}`;
}

/**
 * `alternates` for generateMetadata: canonical plus every locale's version of
 * the same page (hreflang), reciprocal by construction since every version
 * calls this with the same set of locales. `locales` narrows that set for a
 * page the review gate keeps out of some languages. x-default points at
 * DEFAULT_LOCALE, which every page has.
 */
export function pageAlternates(
  locale: Locale,
  path: SeoPath,
  locales: readonly Locale[] = LOCALES,
): { canonical: string; languages: Record<string, string> } {
  const languages: Record<string, string> = {};
  for (const l of locales) languages[HTML_LANG[l]] = localePath(l, path);
  languages["x-default"] = localePath(DEFAULT_LOCALE, path);
  return { canonical: localePath(locale, path), languages };
}

/**
 * `openGraph` for generateMetadata, naming the segment's share image so its
 * alt text can be in the page's language: an opengraph-image file's `alt`
 * export is one string for every locale. Next adds the file's own image only
 * when the segment names none, and a segment's openGraph replaces its
 * parent's rather than merging, so this carries the shared fields as well.
 */
export function openGraph(
  locale: Locale,
  siteName: string,
  image: { path: "" | "timeline" | "credits"; alt: string },
): NonNullable<Metadata["openGraph"]> {
  return {
    siteName,
    locale: HTML_LANG[locale],
    alternateLocale: LOCALES.filter((l) => l !== locale).map((l) => HTML_LANG[l]),
    type: "website",
    images: [
      {
        // Trailing slash: next.config's trailingSlash would 308 the bare path.
        url: `${localePath(locale, image.path)}opengraph-image/`,
        alt: image.alt,
        type: OG_CONTENT_TYPE,
        ...OG_SIZE,
      },
    ],
  };
}
