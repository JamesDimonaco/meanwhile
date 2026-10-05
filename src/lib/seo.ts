import type { Metadata } from "next";
import { DEFAULT_LOCALE, HTML_LANG, LOCALES, type Locale } from "@/i18n/locales";
import type { Culture } from "@/lib/data/schema";
import type { War } from "@/lib/data/war-schema";
import { warOuter } from "@/lib/data/wars";
import { OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og/theme";
import { formatYear } from "@/lib/years";

// One env var, one fallback, used everywhere a full URL is needed
// (metadataBase, sitemap, robots). No trailing slash.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://meanwhile.dimonaco.co.uk").replace(/\/+$/, "");

/** Site-relative path for a page: "" (home) | "timeline" | "credits" | "c/shang" | "wars" | "country/mx" | "war/korean-war". */
export type SeoPath = "" | "timeline" | "credits" | `c/${string}` | "wars" | `country/${string}` | `war/${string}`;

/** Every page's URL, matching next.config's trailingSlash: true. */
export function localePath(locale: Locale, path: SeoPath): string {
  return path ? `/${locale}/${path}/` : `/${locale}/`;
}

export function absoluteUrl(pathname: string): string {
  return `${SITE_URL}${pathname}`;
}

/**
 * x-default: the home page's is "/", the language chooser x-default was
 * designed for; any other page's is its DEFAULT_LOCALE version, which every
 * page has.
 */
export function xDefaultPath(path: SeoPath): string {
  return path ? localePath(DEFAULT_LOCALE, path) : "/";
}

/**
 * `alternates` for generateMetadata: canonical plus every locale's version of
 * the same page (hreflang), reciprocal by construction since every version
 * calls this with the same set of locales. `locales` narrows that set for a
 * page the review gate keeps out of some languages.
 */
export function pageAlternates(
  locale: Locale,
  path: SeoPath,
  locales: readonly Locale[] = LOCALES,
): { canonical: string; languages: Record<string, string> } {
  const languages: Record<string, string> = {};
  for (const l of locales) languages[HTML_LANG[l]] = localePath(l, path);
  languages["x-default"] = xDefaultPath(path);
  return { canonical: localePath(locale, path), languages };
}

/**
 * `openGraph` for generateMetadata, naming the segment's share image so its
 * alt text can be in the page's language: an opengraph-image file's `alt`
 * export is one string for every locale. Next adds the file's own image only
 * when the segment names none, and a segment's openGraph replaces its
 * parent's rather than merging, so this carries the shared fields as well.
 * `locales` narrows og:locale:alternate as it does pageAlternates.
 */
export function openGraph(
  locale: Locale,
  siteName: string,
  image: { path: SeoPath; alt: string },
  locales: readonly Locale[] = LOCALES,
): NonNullable<Metadata["openGraph"]> {
  return {
    siteName,
    locale: HTML_LANG[locale],
    alternateLocale: locales.filter((l) => l !== locale).map((l) => HTML_LANG[l]),
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

/** JSON for a <script type="application/ld+json">, with < escaped so no string in it can close the tag. */
export function jsonLd(data: Record<string, unknown>): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

/** The WebSite block: sets the site name Google shows above each result. The same on "/" and every locale home. */
export function websiteJsonLd(appName: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    name: appName,
    url: `${SITE_URL}/`,
    inLanguage: LOCALES.map((l) => HTML_LANG[l]),
  };
}

const REPO_URL = "https://github.com/JamesDimonaco/meanwhile";

/** An astronomical year as an ISO 8601 year, which numbers years the same way: -4099 (4100 BCE) is "-4099". */
function isoYear(year: number): string {
  return `${year < 0 ? "-" : ""}${String(Math.abs(year)).padStart(4, "0")}`;
}

/**
 * The Dataset block for Google Dataset Search, on /en/credits/ only: one
 * entry rather than three locale copies. It names no war, so no gated war's
 * id or name can reach es/zh output. No creator: the site shows no byline.
 */
export function datasetJsonLd(appName: string, cultures: readonly Culture[], wars: readonly War[]) {
  const from = Math.min(...cultures.flatMap((c) => c.periods.map((p) => p.earliestStart)), ...wars.map((w) => warOuter(w)[0]));
  return {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: `${appName}: dated civilisations and wars`,
    description:
      `Dates, phases, events and sourced facts for ${cultures.length} civilisations and ${wars.length} wars, ` +
      `from ${formatYear(from, "en")} to the present, in English, Spanish and Simplified Chinese. ` +
      "Every period, event and fact cites its sources, and every event at least two. " +
      "Years are stored in astronomical numbering (1 BCE = 0).",
    url: absoluteUrl(localePath("en", "credits")),
    sameAs: `${REPO_URL}/tree/main/data`,
    license: "https://creativecommons.org/licenses/by/4.0/",
    isAccessibleForFree: true,
    inLanguage: LOCALES.map((l) => HTML_LANG[l]),
    keywords: ["history", "chronology", "civilisations", "dynasties", "wars", "timeline"],
    // Open end: some wars are still going on.
    temporalCoverage: `${isoYear(from)}/..`,
    distribution: [{ "@type": "DataDownload", encodingFormat: "application/zip", contentUrl: `${REPO_URL}/archive/refs/heads/main.zip` }],
  };
}
