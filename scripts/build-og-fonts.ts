import fs from "node:fs";
import path from "node:path";
import subsetFont from "subset-font";

/**
 * Builds assets/og-fonts/*: sfnt (TrueType/OpenType) fonts for next/og's
 * ImageResponse (satori/resvg), which reads font files directly rather than
 * over CSS and doesn't support woff2 — so these are separate from, and in a
 * different format to, the woff2 the browser gets from public/fonts/.
 *
 * Latin (Inter) reuses the same fixed block list as subset-latin-font.ts:
 * small even in full, so no need to derive it from content. The CJK face is
 * different: subset only to the Han characters actually used in the OG
 * images (culture names, native names, and the handful of message strings
 * the image JSX renders) rather than the full site subset in
 * subset-cjk-font.ts, since satori embeds the font bytes into every one of
 * the ~130 generated images and every unused glyph is dead weight repeated
 * that many times.
 *
 * Run again (`pnpm build-og-fonts`) whenever OG image copy or the culture
 * roster changes, then commit the regenerated assets/og-fonts/*.
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

function readJson(p: string): unknown {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

/** Every Han/CJK-punctuation character the OG image JSX can render, for any locale/culture. */
function ogCjkText(): string {
  const strings: string[] = [
    "公元前公元年", // era labels + counter word (years.ts)
    "—", // em dash used as the zh date-range separator
  ];

  const common = readJson(path.join(ROOT, "messages/zh/common.json")) as { tagline: string };
  const timeline = readJson(path.join(ROOT, "messages/zh/timeline.json")) as { title: string };
  const meanwhileMsg = readJson(path.join(ROOT, "messages/zh/meanwhile.json")) as { heading: string };
  strings.push(common.tagline, timeline.title, meanwhileMsg.heading);

  const cultureFiles = fs
    .readdirSync(path.join(ROOT, "data/cultures"), { recursive: true, encoding: "utf8" })
    .filter((f) => f.endsWith(".json"));
  for (const f of cultureFiles) {
    const c = readJson(path.join(ROOT, "data/cultures", f)) as {
      name: { zh?: string };
      nativeName?: { text: string };
    };
    if (c.name.zh) strings.push(c.name.zh);
    if (c.nativeName) strings.push(c.nativeName.text);
  }

  const isHanOrCjkPunct = (cp: number) =>
    (cp >= 0x4e00 && cp <= 0x9fff) ||
    (cp >= 0x3400 && cp <= 0x4dbf) ||
    (cp >= 0x3000 && cp <= 0x303f) ||
    (cp >= 0xff00 && cp <= 0xffef) ||
    cp === 0x2014 ||
    cp === 0x2013;

  const chars = new Set<string>();
  for (const s of strings) for (const ch of s) if (isHanOrCjkPunct(ch.codePointAt(0)!)) chars.add(ch);
  return [...chars].sort().join("");
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const latin = latinText();
  for (const { name, source } of INTER_WEIGHTS) {
    const buffer = await ensureInter(source);
    const subset = await subsetFont(buffer, latin, { targetFormat: "sfnt", noHinting: true });
    const outPath = path.join(OUT_DIR, `${name}.ttf`);
    fs.writeFileSync(outPath, subset);
    console.log(`Wrote ${path.relative(ROOT, outPath)} (${(subset.length / 1024).toFixed(1)}KB).`);
  }

  const cjkText = ogCjkText();
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
