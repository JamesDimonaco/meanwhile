import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";
import { pageLocale } from "@/i18n/page-locale";
import { contemporaryNames } from "@/lib/data/culture-copy";
import { loadCulture, loadCultures } from "@/lib/data/load";
import { localize } from "@/lib/data/localize";
import { defaultPeriod } from "@/lib/data/queries";
import { formatYearRange } from "@/lib/years";
import { ogFonts } from "@/lib/og/fonts";
import { ogFrame } from "@/lib/og/frame";
import { ogColors, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og/theme";
import { SITE_URL } from "@/lib/seo";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

const brand = new URL(SITE_URL).host;

export function generateStaticParams() {
  return loadCultures().map((c) => ({ id: c.id }));
}

export async function generateImageMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return [{ alt: localize(loadCulture(id).name, "en"), size, contentType }];
}

export default async function Image({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const locale = await pageLocale(params);
  const { id } = await params;
  const culture = loadCulture(id);
  const cultures = loadCultures();
  const t = await getTranslations({ locale, namespace: "meanwhile" });
  const tCommon = await getTranslations({ locale, namespace: "common" });

  const period = defaultPeriod(culture);
  const range = formatYearRange(period.latestStart, period.earliestEnd, locale);
  const others = contemporaryNames(culture, cultures, locale, 3);
  const othersLine = others.length > 0 ? `${t("heading")} ${new Intl.ListFormat(locale).format(others)}` : null;

  return new ImageResponse(
    ogFrame(
      <>
        <div style={{ display: "flex", fontSize: 30, fontWeight: 600, color: ogColors.muted, letterSpacing: 4 }}>
          {tCommon("appName").toUpperCase()}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: 16 }}>
          <div style={{ display: "flex", fontSize: 64, fontWeight: 600 }}>{localize(culture.name, locale)}</div>
          {culture.nativeName && (
            <div style={{ display: "flex", fontSize: 40, color: ogColors.muted }}>{culture.nativeName.text}</div>
          )}
        </div>
        <div style={{ display: "flex", fontSize: 36, color: ogColors.muted }}>{range}</div>
        {othersLine && (
          <div style={{ display: "flex", fontSize: 30, maxWidth: 980, marginTop: 12 }}>{othersLine}</div>
        )}
      </>,
      brand,
    ),
    { ...size, fonts: ogFonts() },
  );
}
