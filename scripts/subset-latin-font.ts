import fs from "node:fs";
import path from "node:path";
import subsetFont from "subset-font";

/**
 * Builds public/fonts/inter-{regular,semibold}.woff2 from a cached Inter
 * release: Latin script only (Basic Latin, Latin-1 Supplement, Latin
 * Extended-A/B, General Punctuation, currency), which covers en and es and
 * every Latin-alphabet native name/alias. Unlike the CJK subset, this range
 * is small even in full, so it's a fixed block list rather than derived from
 * today's data — a future es or native-name string never needs a regenerate.
 *
 * Run again (`pnpm subset-latin-font`) only if the source release changes.
 */

const ROOT = process.cwd();
const CACHE_DIR = path.join(ROOT, ".font-cache");
const SOURCE_URL = "https://github.com/rsms/inter/releases/download/v4.1/Inter-4.1.zip";
const OUT_DIR = path.join(ROOT, "public/fonts");
const SIZE_BUDGET_BYTES = 150 * 1024;

const RANGES: ReadonlyArray<readonly [number, number]> = [
  [0x0000, 0x024f], // Basic Latin, Latin-1 Supplement, Latin Extended-A/B
  [0x02b0, 0x02ff], // Spacing Modifier Letters (used by some transliterations)
  [0x2000, 0x206f], // General Punctuation (en/em dash, quotes, ellipsis, nbsp-width spaces)
  [0x20a0, 0x20cf], // Currency Symbols
  [0x2100, 0x214f], // Letterlike Symbols (№, ™ etc., cheap to include)
];

const WEIGHTS: ReadonlyArray<{ name: string; source: string }> = [
  { name: "inter-regular", source: "Inter-Regular.ttf" },
  { name: "inter-semibold", source: "Inter-SemiBold.ttf" },
];

function latinText(): string {
  let out = "";
  for (const [from, to] of RANGES) {
    for (let cp = from; cp <= to; cp++) out += String.fromCodePoint(cp);
  }
  return out;
}

async function ensureSource(fileName: string): Promise<Buffer> {
  const cached = path.join(CACHE_DIR, fileName);
  if (fs.existsSync(cached)) return fs.readFileSync(cached);

  fs.mkdirSync(CACHE_DIR, { recursive: true });
  const zipPath = path.join(CACHE_DIR, "Inter.zip");
  if (!fs.existsSync(zipPath)) {
    console.log(`Fetching source font from ${SOURCE_URL} (one-off, ~30MB)…`);
    const res = await fetch(SOURCE_URL);
    if (!res.ok) throw new Error(`Failed to fetch source font: ${res.status} ${res.statusText}`);
    fs.writeFileSync(zipPath, Buffer.from(await res.arrayBuffer()));
  }

  const { execFileSync } = await import("node:child_process");
  execFileSync("unzip", ["-q", "-o", zipPath, `extras/ttf/${fileName}`, "-d", CACHE_DIR]);
  fs.copyFileSync(path.join(CACHE_DIR, "extras/ttf", fileName), cached);
  return fs.readFileSync(cached);
}

async function main() {
  const text = latinText();
  console.log(`Subsetting Latin range: ${text.length} code points.`);

  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const { name, source } of WEIGHTS) {
    const buffer = await ensureSource(source);
    const subset = await subsetFont(buffer, text, { targetFormat: "woff2", noHinting: true });
    const outPath = path.join(OUT_DIR, `${name}.woff2`);
    fs.writeFileSync(outPath, subset);
    const kb = (subset.length / 1024).toFixed(1);
    console.log(`Wrote ${path.relative(ROOT, outPath)} (${kb}KB).`);
    if (subset.length > SIZE_BUDGET_BYTES) {
      console.error(`${name}: over the ${SIZE_BUDGET_BYTES / 1024}KB budget.`);
      process.exit(1);
    }
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
