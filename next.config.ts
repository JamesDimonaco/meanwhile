import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Kept from the static-export days so every URL stays exactly as it was.
  trailingSlash: true,
  // The scan route reads culture names at request time, and file tracing
  // can't see the directory walk in load.ts.
  outputFileTracingIncludes: { "/api/scan": ["./data/**/*.json"] },
};

export default withNextIntl(nextConfig);
