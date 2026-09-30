import fs from "node:fs";
import path from "node:path";

/**
 * Font bytes for next/og's ImageResponse (satori), read once at module scope
 * since they're build-time constants, not request data (see Next's
 * "Predictable values" guidance). sfnt/otf, not the woff2 served to the
 * browser — see scripts/build-og-fonts.ts for why and how they're built.
 *
 * The JSX in every opengraph-image.tsx deliberately never sets
 * `fontFamily`: satori falls back per-character across every font passed
 * here when the current one lacks a glyph, which is what lets one JSX tree
 * mix Latin and Han text (a culture name plus its native name) without the
 * caller having to pick a font per string.
 */

const DIR = path.join(process.cwd(), "assets/og-fonts");

const interRegular = fs.readFileSync(path.join(DIR, "inter-regular.ttf"));
const interSemibold = fs.readFileSync(path.join(DIR, "inter-semibold.ttf"));
const notoSansSC = fs.readFileSync(path.join(DIR, "noto-sans-sc-og.otf"));

type OgFont = { name: string; data: Buffer; weight: 400 | 600; style: "normal" };

export function ogFonts(): OgFont[] {
  return [
    { name: "Inter", data: interRegular, weight: 400, style: "normal" },
    { name: "Inter", data: interSemibold, weight: 600, style: "normal" },
    { name: "Noto Sans SC", data: notoSansSC, weight: 400, style: "normal" },
  ];
}
