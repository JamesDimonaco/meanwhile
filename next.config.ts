import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { LOCALES } from "./src/i18n/locales";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Kept from the static-export days: every URL ends in a slash.
  trailingSlash: true,
  // The scan route reads the culture files at request time (files.ts); named
  // here so they ship even if file tracing misses that directory walk.
  outputFileTracingIncludes: { "/api/scan": ["./data/cultures/**/*.json"] },
  // Static assets default to max-age=0 on Vercel, so every page view revalidates each one. Inter never changes
  // under its name; the CJK subsets are rebuilt as the data grows, so they and the rest may lag a day.
  async headers() {
    return [
      { source: "/fonts/:file(inter-.*)", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
      {
        source: "/:dir(flags|geo|icons)/:file*",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }],
      },
      {
        source: "/fonts/:file(noto-.*)",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }],
      },
    ];
  },
  // A country's wars page became its country page; old links and sitemaps still point there.
  async redirects() {
    return [
      {
        source: `/:locale(${LOCALES.join("|")})/wars/:code([a-z]{2})/`,
        destination: "/:locale/country/:code/",
        permanent: true,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
