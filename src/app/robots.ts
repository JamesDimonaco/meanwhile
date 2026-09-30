import type { MetadataRoute } from "next";
import { absoluteUrl, SITE_URL } from "@/lib/seo";

// Static export has no server to compute this per request.
export const dynamic = "force-static";

// Nothing on the site is private: no accounts, no admin routes. One rule
// for every crawler (Baidu and Bing read the same directives as Google).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: absoluteUrl("/sitemap.xml"),
    host: SITE_URL,
  };
}
