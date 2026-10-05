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
  // Static assets were served with max-age=0, so every repeat visit paid a
  // round trip (cross-border from mainland China). Not immutable: the file
  // names aren't hashed, so a changed file must still reach people.
  async headers() {
    const cache = [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }];
    return ["/fonts/:path*", "/flags/:path*", "/geo/:path*"].map((source) => ({ source, headers: cache }));
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
