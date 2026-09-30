import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";
import { pageLocale } from "@/i18n/page-locale";
import { ogFonts } from "@/lib/og/fonts";
import { ogFrame } from "@/lib/og/frame";
import { ogColors, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og/theme";
import { SITE_URL } from "@/lib/seo";

export const alt = "Meanwhile";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

const brand = new URL(SITE_URL).host;

export default async function Image({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await pageLocale(params);
  const t = await getTranslations({ locale, namespace: "common" });

  return new ImageResponse(
    ogFrame(
      <>
        <div style={{ display: "flex", fontSize: 32, fontWeight: 600, color: ogColors.muted, letterSpacing: 4 }}>
          {t("appName").toUpperCase()}
        </div>
        <div style={{ display: "flex", fontSize: 60, fontWeight: 600, lineHeight: 1.2, maxWidth: 920 }}>
          {t("tagline")}
        </div>
      </>,
      brand,
    ),
    { ...size, fonts: ogFonts() },
  );
}
