import { ImageResponse } from "next/og";
import { pageLocale } from "@/i18n/page-locale";
import { loadMessages } from "@/i18n/messages";
import { routing } from "@/i18n/routing";
import { homeOg } from "@/lib/og/copy";
import { ogFonts } from "@/lib/og/fonts";
import { ogFrame } from "@/lib/og/frame";
import { ogColors, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og/theme";
import { SITE_URL } from "@/lib/seo";

// Built once per deploy: nothing here changes between requests.
export const dynamic = "force-static";
export const alt = "Meanwhile";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

const brand = new URL(SITE_URL).host;

// Route Handlers (which this file is, under the hood) need their own
// generateStaticParams to be prerendered, unlike page.tsx which inherits
// [locale]'s from the layout.
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function Image({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await pageLocale(params);
  const copy = homeOg(locale, await loadMessages(locale));

  return new ImageResponse(
    ogFrame(
      [
        <div key="eyebrow" style={{ display: "flex", fontSize: 32, fontWeight: 600, color: ogColors.muted, letterSpacing: 4 }}>
          {copy.eyebrow}
        </div>,
        <div key="tagline" style={{ display: "flex", fontSize: 60, fontWeight: 600, lineHeight: 1.2, maxWidth: 920 }}>
          {copy.tagline}
        </div>,
      ],
      brand,
    ),
    { ...size, fonts: ogFonts() },
  );
}
