import fs from "node:fs";
import path from "node:path";
import subsetFont from "subset-font";

/**
 * Builds public/fonts/noto-sans-sc-subset.woff2: only the Han characters
 * actually used in messages/zh/**, data/cultures/** and data/borders/**.
 * A full Simplified Chinese font is many megabytes; this keeps the shipped
 * font well under 300KB by never sending a glyph nobody will read.
 *
 * Run again (`pnpm subset-cjk-font`) whenever new zh content lands, then
 * commit the regenerated public/fonts/noto-sans-sc-subset.woff2.
 *
 * The source font itself is not committed (it's 8MB+): this script fetches
 * it once into .font-cache/, a gitignored directory, and reuses it after that.
 */

const ROOT = process.cwd();
const CACHE_DIR = path.join(ROOT, ".font-cache");
const SOURCE_PATH = path.join(CACHE_DIR, "NotoSansSC-Regular.otf");
const SOURCE_URL =
  "https://github.com/notofonts/noto-cjk/releases/download/Sans2.004/18_NotoSansSC.zip";
const OUT_PATH = path.join(ROOT, "public/fonts/noto-sans-sc-subset.woff2");
const SIZE_BUDGET_BYTES = 300 * 1024;

// A few characters worth keeping even before any data uses them: the era
// labels (years.ts) and common CJK punctuation, so early pages never show
// tofu for the UI chrome itself.
const ALWAYS_INCLUDE = "公元前年—、，。：；「」『』（）《》？！…";

function collectStrings(value: unknown, out: string[]): void {
  if (typeof value === "string") {
    out.push(value);
  } else if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, out);
  } else if (value && typeof value === "object") {
    for (const [key, v] of Object.entries(value)) {
      // `note`/`label`/`name`/etc are LocalizedText { en, es?, zh? }: only zh
      // renders in this font. `zh` is also used for a `lang` tag ("zh-Hans"),
      // which is Latin, so filtering by CJK codepoints below is what matters,
      // not the key name — but skip the odd non-text field to save a walk.
      if (key === "url" || key === "id" || key === "periodoId" || key === "wikidataId") continue;
      collectStrings(v, out);
    }
  }
}

function readJsonFilesRecursive(dir: string): unknown[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { recursive: true, encoding: "utf8" })
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")) as unknown);
}

function collectHanCharacters(): string {
  const strings: string[] = [ALWAYS_INCLUDE];

  for (const file of fs.readdirSync(path.join(ROOT, "messages/zh"))) {
    strings.push(fs.readFileSync(path.join(ROOT, "messages/zh", file), "utf8"));
  }
  for (const doc of readJsonFilesRecursive(path.join(ROOT, "data/cultures"))) {
    collectStrings(doc, strings);
  }
  for (const doc of readJsonFilesRecursive(path.join(ROOT, "data/borders"))) {
    collectStrings(doc, strings);
  }

  // CJK Unified Ideographs + Extension A, plus the CJK Symbols and
  // Punctuation block; anything else (Latin lang tags, ids) is dropped.
  const isHanOrCjkPunct = (cp: number) =>
    (cp >= 0x4e00 && cp <= 0x9fff) ||
    (cp >= 0x3400 && cp <= 0x4dbf) ||
    (cp >= 0x3000 && cp <= 0x303f) ||
    (cp >= 0xff00 && cp <= 0xffef) ||
    cp === 0x2014 ||
    cp === 0x2013;

  const chars = new Set<string>();
  for (const s of strings) {
    for (const ch of s) {
      if (isHanOrCjkPunct(ch.codePointAt(0)!)) chars.add(ch);
    }
  }
  return [...chars].sort().join("");
}

async function ensureSourceFont(): Promise<Buffer> {
  if (fs.existsSync(SOURCE_PATH)) return fs.readFileSync(SOURCE_PATH);

  fs.mkdirSync(CACHE_DIR, { recursive: true });
  console.log(`Fetching source font from ${SOURCE_URL} (one-off, ~50MB)…`);
  const res = await fetch(SOURCE_URL);
  if (!res.ok) throw new Error(`Failed to fetch source font: ${res.status} ${res.statusText}`);
  const zipPath = path.join(CACHE_DIR, "NotoSansSC.zip");
  fs.writeFileSync(zipPath, Buffer.from(await res.arrayBuffer()));

  const { execFileSync } = await import("node:child_process");
  execFileSync("unzip", ["-q", "-o", zipPath, "NotoSansSC-Regular.otf", "-d", CACHE_DIR]);
  fs.rmSync(zipPath);

  return fs.readFileSync(SOURCE_PATH);
}

async function main() {
  const text = collectHanCharacters();
  console.log(`Subsetting to ${text.length} unique Han/CJK-punctuation characters.`);

  const source = await ensureSourceFont();
  const subset = await subsetFont(source, text, { targetFormat: "woff2", noHinting: true });

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, subset);

  const kb = (subset.length / 1024).toFixed(1);
  console.log(`Wrote ${path.relative(ROOT, OUT_PATH)} (${kb}KB).`);
  if (subset.length > SIZE_BUDGET_BYTES) {
    console.error(`Over the ${SIZE_BUDGET_BYTES / 1024}KB budget — check what pulled in new characters.`);
    process.exit(1);
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
