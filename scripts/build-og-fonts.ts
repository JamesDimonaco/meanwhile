import fs from "node:fs";
import path from "node:path";
import subsetFont from "subset-font";
import { LOCALES } from "@/i18n/locales";
import { loadMessages } from "@/i18n/messages";
import { loadCultures, loadWars } from "@/lib/data/load";
import { ogText } from "@/lib/og/copy";

/**
 * Builds assets/og-fonts/*: sfnt (TrueType/OpenType) fonts for next/og's
 * ImageResponse (satori/resvg), which reads font files directly rather than
 * over CSS and doesn't support woff2 — so these are separate from, and in a
 * different format to, the woff2 the browser gets from public/fonts/.
 *
 * Both are subset from ogText (src/lib/og/copy.ts), the same strings the OG
 * routes draw, in every locale. Inter also keeps a fixed Latin block list
 * (small even in full), plus whatever else it has a glyph for (Greek native
 * names). Noto Sans SC gets every non-Latin character, rather than the full
 * site subset in subset-cjk-font.ts: the font is loaded for every generated
 * image, so every unused glyph is dead weight.
 *
 * Run again (`pnpm build-og-fonts`) whenever OG image copy, the culture
 * roster or the wars change, then commit the regenerated assets/og-fonts/*;
 * src/lib/og/fonts.test.ts fails until you do.
 */

const ROOT = process.cwd();
const CACHE_DIR = path.join(ROOT, ".font-cache");
const OUT_DIR = path.join(ROOT, "assets/og-fonts");
const INTER_SOURCE_URL = "https://github.com/rsms/inter/releases/download/v4.1/Inter-4.1.zip";
const NOTO_SOURCE_URL = "https://github.com/notofonts/noto-cjk/releases/download/Sans2.004/18_NotoSansSC.zip";

const LATIN_RANGES: ReadonlyArray<readonly [number, number]> = [
  [0x0000, 0x024f], // Basic Latin, Latin-1 Supplement, Latin Extended-A/B
  [0x02b0, 0x02ff], // Spacing Modifier Letters
  [0x2000, 0x206f], // General Punctuation
  [0x20a0, 0x20cf], // Currency Symbols
  [0x2100, 0x214f], // Letterlike Symbols
];

const INTER_WEIGHTS: ReadonlyArray<{ name: string; source: string }> = [
  { name: "inter-regular", source: "Inter-Regular.ttf" },
  { name: "inter-semibold", source: "Inter-SemiBold.ttf" },
];

function latinText(): string {
  let out = "";
  for (const [from, to] of LATIN_RANGES) for (let cp = from; cp <= to; cp++) out += String.fromCodePoint(cp);
  return out;
}

async function ensureInter(fileName: string): Promise<Buffer> {
  const cached = path.join(CACHE_DIR, fileName);
  if (fs.existsSync(cached)) return fs.readFileSync(cached);

  fs.mkdirSync(CACHE_DIR, { recursive: true });
  const zipPath = path.join(CACHE_DIR, "Inter.zip");
  if (!fs.existsSync(zipPath)) {
    console.log(`Fetching source font from ${INTER_SOURCE_URL} (one-off, ~30MB)…`);
    const res = await fetch(INTER_SOURCE_URL);
    if (!res.ok) throw new Error(`Failed to fetch Inter: ${res.status} ${res.statusText}`);
    fs.writeFileSync(zipPath, Buffer.from(await res.arrayBuffer()));
  }

  const { execFileSync } = await import("node:child_process");
  execFileSync("unzip", ["-q", "-o", zipPath, `extras/ttf/${fileName}`, "-d", CACHE_DIR]);
  fs.copyFileSync(path.join(CACHE_DIR, "extras/ttf", fileName), cached);
  return fs.readFileSync(cached);
}

async function ensureNotoSansSC(): Promise<Buffer> {
  const cached = path.join(CACHE_DIR, "NotoSansSC-Regular.otf");
  if (fs.existsSync(cached)) return fs.readFileSync(cached);

  fs.mkdirSync(CACHE_DIR, { recursive: true });
  console.log(`Fetching source font from ${NOTO_SOURCE_URL} (one-off, ~50MB)…`);
  const res = await fetch(NOTO_SOURCE_URL);
  if (!res.ok) throw new Error(`Failed to fetch NotoSansSC: ${res.status} ${res.statusText}`);
  const zipPath = path.join(CACHE_DIR, "NotoSansSC.zip");
  fs.writeFileSync(zipPath, Buffer.from(await res.arrayBuffer()));

  const { execFileSync } = await import("node:child_process");
  execFileSync("unzip", ["-q", "-o", zipPath, "NotoSansSC-Regular.otf", "-d", CACHE_DIR]);
  fs.rmSync(zipPath);
  return fs.readFileSync(cached);
}

const inLatinRanges = (cp: number) => LATIN_RANGES.some(([from, to]) => cp >= from && cp <= to);

async function ogCharacters(): Promise<string[]> {
  const cultures = loadCultures();
  const wars = loadWars();
  const chars = new Set<string>();
  for (const locale of LOCALES) {
    for (const text of ogText(locale, await loadMessages(locale), cultures, wars)) for (const ch of text) chars.add(ch);
  }
  return [...chars].sort();
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const og = await ogCharacters();
  const interText = latinText() + og.join("");
  for (const { name, source } of INTER_WEIGHTS) {
    const buffer = await ensureInter(source);
    const subset = await subsetFont(buffer, interText, { targetFormat: "sfnt", noHinting: true });
    const outPath = path.join(OUT_DIR, `${name}.ttf`);
    fs.writeFileSync(outPath, subset);
    console.log(`Wrote ${path.relative(ROOT, outPath)} (${(subset.length / 1024).toFixed(1)}KB).`);
  }

  const cjkText = og.filter((ch) => !inLatinRanges(ch.codePointAt(0)!)).join("");
  const notoBuffer = await ensureNotoSansSC();
  const cjkSubset = await subsetFont(notoBuffer, cjkText, { targetFormat: "sfnt", noHinting: true });
  const cjkOutPath = path.join(OUT_DIR, "noto-sans-sc-og.otf");
  fs.writeFileSync(cjkOutPath, cjkSubset);
  console.log(
    `Wrote ${path.relative(ROOT, cjkOutPath)} (${(cjkSubset.length / 1024).toFixed(1)}KB), ${cjkText.length} characters.`,
  );
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
