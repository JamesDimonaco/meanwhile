import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  output: "export",
  // Emits /en/index.html so any static host (not just Vercel) serves clean URLs.
  trailingSlash: true,
  images: { unoptimized: true },
};

export default withNextIntl(nextConfig);
