import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Kept from the static-export days so every URL stays exactly as it was.
  trailingSlash: true,
  // The scan route reads the culture files at request time (files.ts); named
  // here so they ship even if file tracing misses that directory walk.
  outputFileTracingIncludes: { "/api/scan": ["./data/cultures/**/*.json"] },
};

export default withNextIntl(nextConfig);
