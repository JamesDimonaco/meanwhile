import { ImageResponse } from "next/og";
import { pageLocale } from "@/i18n/page-locale";
import { loadMessages } from "@/i18n/messages";
import { routing } from "@/i18n/routing";
import { loadCulture, loadCultures } from "@/lib/data/load";
import { cultureOg } from "@/lib/og/copy";
import { ogFonts } from "@/lib/og/fonts";
import { ogFrame } from "@/lib/og/frame";
import { ogColors, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og/theme";
import { SITE_URL } from "@/lib/seo";

// Built once per deploy: nothing here changes between requests.
export const dynamic = "force-static";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

const brand = new URL(SITE_URL).host;

// Route Handlers don't inherit generateStaticParams from an ancestor layout
// the way page.tsx does, so this needs the full locale × id cross product.
export function generateStaticParams() {
  return routing.locales.flatMap((locale) => loadCultures().map((c) => ({ locale, id: c.id })));
}

export default async function Image({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const locale = await pageLocale(params);
  const { id } = await params;
  const culture = loadCulture(id);
  const cultures = loadCultures();
  const copy = cultureOg(locale, await loadMessages(locale), culture, cultures);

  return new ImageResponse(
    ogFrame(
      [
        <div key="eyebrow" style={{ display: "flex", fontSize: 30, fontWeight: 600, color: ogColors.muted, letterSpacing: 4 }}>
          {copy.eyebrow}
        </div>,
        <div key="name" style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: 16 }}>
          <div style={{ display: "flex", fontSize: 64, fontWeight: 600 }}>{copy.name}</div>
          {copy.nativeName && (
            <div style={{ display: "flex", fontSize: 40, color: ogColors.muted }}>{copy.nativeName}</div>
          )}
        </div>,
        <div key="range" style={{ display: "flex", fontSize: 36, color: ogColors.muted }}>{copy.range}</div>,
        ...(copy.others
          ? [
              <div key="others" style={{ display: "flex", fontSize: 30, maxWidth: 980, marginTop: 12 }}>
                {copy.others}
              </div>,
            ]
          : []),
      ],
      brand,
    ),
    { ...size, fonts: ogFonts() },
  );
}
