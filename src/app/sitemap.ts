import type { MetadataRoute } from "next";
import { DEFAULT_LOCALE, HTML_LANG, LOCALES } from "@/i18n/locales";
import { loadCultures } from "@/lib/data/load";
import { absoluteUrl, localePath, type SeoPath } from "@/lib/seo";

// Built once per deploy: nothing here changes between requests.
export const dynamic = "force-static";

/** Every page path, locale-free: the root redirect has no content of its own, so it's excluded. */
function paths(): SeoPath[] {
  return ["", "timeline", "credits", ...loadCultures().map((c) => `c/${c.id}` as const)];
}

/** One row per locale of a path, each carrying the reciprocal hreflang set (Google wants every row self-listed too). */
function rows(path: SeoPath): MetadataRoute.Sitemap {
  const languages = Object.fromEntries(LOCALES.map((l) => [HTML_LANG[l], absoluteUrl(localePath(l, path))]));
  languages["x-default"] = absoluteUrl(localePath(DEFAULT_LOCALE, path));
  return LOCALES.map((locale) => ({ url: absoluteUrl(localePath(locale, path)), alternates: { languages } }));
}

export default function sitemap(): MetadataRoute.Sitemap {
  return paths().flatMap(rows);
}
