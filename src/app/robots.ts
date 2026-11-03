import type { MetadataRoute } from "next";
import { LOCALES } from "@/i18n/locales";
import { absoluteUrl } from "@/lib/seo";

// Built once per deploy: nothing here changes between requests.
export const dynamic = "force-static";

// Crawlers that copy pages to train models and send no visitors back. Every
// page is a Vercel cache read, and in November 2026 Reflectionbot alone made
// most of the site's requests. Search crawlers stay welcome: they bring people.
const AI_TRAINING_CRAWLERS = [
  "Reflectionbot",
  "GPTBot",
  "ClaudeBot",
  "CCBot",
  "Bytespider",
  "meta-externalagent",
  "Amazonbot",
];

// Nothing on the site is private: no accounts, no admin routes. Every other
// crawler gets one rule (Baidu and Bing read the same directives as Google).
// It skips compare: the page reads ?ids= in the browser, so every pair of
// cultures is a new URL to a crawler and a cache miss, with nothing to index.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: AI_TRAINING_CRAWLERS, disallow: "/" },
      { userAgent: "*", allow: "/", disallow: LOCALES.map((l) => `/${l}/compare/`) },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
