import { ImageResponse } from "next/og";
import { notFound } from "next/navigation";
import { pageLocale } from "@/i18n/page-locale";
import { loadMessages } from "@/i18n/messages";
import { routing } from "@/i18n/routing";
import { loadWars } from "@/lib/data/load";
import { isShownIn, warsShownIn } from "@/lib/data/wars";
import { warOg } from "@/lib/og/copy";
import { ogFonts } from "@/lib/og/fonts";
import { ogFrame } from "@/lib/og/frame";
import { ogColors, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og/theme";
import { SITE_URL } from "@/lib/seo";

// Built once per deploy: nothing here changes between requests.
export const dynamic = "force-static";
export const dynamicParams = false;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

const brand = new URL(SITE_URL).host;

// A route handler doesn't inherit the page's generateStaticParams, so this
// repeats the review gate: no image in a language the war's page is hidden in.
export function generateStaticParams() {
  return routing.locales.flatMap((locale) => warsShownIn(loadWars(), locale).map((w) => ({ locale, id: w.id })));
}

export default async function Image({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const locale = await pageLocale(params);
  const { id } = await params;
  const war = loadWars().find((w) => w.id === id);
  if (!war || !isShownIn(war, locale)) notFound();
  const copy = warOg(locale, await loadMessages(locale), war);

  return new ImageResponse(
    ogFrame(
      [
        <div key="eyebrow" style={{ display: "flex", fontSize: 30, fontWeight: 600, color: ogColors.muted, letterSpacing: 4 }}>
          {copy.eyebrow}
        </div>,
        <div key="name" style={{ display: "flex", fontSize: 64, fontWeight: 600, maxWidth: 1060 }}>
          {copy.name}
        </div>,
        <div key="range" style={{ display: "flex", fontSize: 36, color: ogColors.muted }}>{copy.range}</div>,
        <div key="sides" style={{ display: "flex", fontSize: 30, maxWidth: 980, marginTop: 12 }}>
          {copy.sides}
        </div>,
      ],
      brand,
    ),
    { ...size, fonts: ogFonts() },
  );
}
