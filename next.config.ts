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
