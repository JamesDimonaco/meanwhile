import type { MetadataRoute } from "next";
import { HTML_LANG, isLocale, LOCALES } from "@/i18n/locales";
import { loadMessages } from "@/i18n/messages";

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

// One manifest per language, linked from that language's pages: Android names
// the installed app from here and iOS from the page's appleWebApp.title, so
// both show the same name.
export async function GET(_request: Request, { params }: RouteContext<"/[locale]/manifest.webmanifest">) {
  const { locale } = await params;
  if (!isLocale(locale)) return new Response(null, { status: 404 });
  const { appName, tagline } = (await loadMessages(locale)).common;
  const manifest: MetadataRoute.Manifest = {
    name: appName,
    short_name: appName,
    description: tagline,
    lang: HTML_LANG[locale],
    start_url: `/${locale}/`,
    display: "standalone",
    background_color: "#171717",
    theme_color: "#171717",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
  return Response.json(manifest, { headers: { "content-type": "application/manifest+json" } });
}
