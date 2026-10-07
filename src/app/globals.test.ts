import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

type Oklch = [number, number, number];
type Rgb = [number, number, number];

const css = fs.readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");

// Only :root: the app never sets .dark, so the light theme is the one people see.
function rootTokens(): Record<string, Oklch> {
  const block = css.match(/^:root \{([\s\S]*?)^\}/m)?.[1];
  if (!block) throw new Error("no :root block");
  const out: Record<string, Oklch> = {};
  for (const [, name, l, c, h] of block.matchAll(/--([\w-]+): oklch\(([\d.]+) ([\d.]+) ([\d.]+)\);/g)) {
    out[name] = [Number(l), Number(c), Number(h)];
  }
  return out;
}

/** OKLCH to linear sRGB (Björn Ottosson's OKLab matrices), unclipped. */
function linearRgb([L, C, H]: Oklch): Rgb {
  const a = C * Math.cos((H * Math.PI) / 180);
  const b = C * Math.sin((H * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

function oklab([r, g, b]: Rgb): Rgb {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

const luminance = ([r, g, b]: Rgb) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
const contrast = (x: Rgb, y: Rgb) => {
  const [hi, lo] = [luminance(x), luminance(y)].sort((p, q) => q - p);
  return (hi + 0.05) / (lo + 0.05);
};

// Machado, Oliveira & Fernandes (2009), severity 1.0, on linear sRGB.
const CVD: Record<"protanopia" | "deuteranopia", number[][]> = {
  protanopia: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deuteranopia: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
};
const simulate = (rgb: Rgb, m: number[][]): Rgb =>
  m.map((row) => Math.min(1, Math.max(0, row[0] * rgb[0] + row[1] * rgb[1] + row[2] * rgb[2]))) as Rgb;
/** OKLab distance ×100, the scale categorical-palette guidance uses. */
const deltaE = (x: Rgb, y: Rgb) => 100 * Math.hypot(...oklab(x).map((v, i) => v - oklab(y)[i]));

const BAR_TOKENS = ["chart-1", "chart-2", "chart-3", "chart-4", "chart-5", "chart-6", "chart-7", "chart-8", "chart-9", "war"];
// Below these, two bars read as one: 15 for full colour vision, 8 under simulated colour blindness.
const MIN_DELTA_E = 15;
const MIN_CVD_DELTA_E = 8;

describe("timeline bar colours (one per region, and wars)", () => {
  const t = rootTokens();
  const rgb = Object.fromEntries(BAR_TOKENS.map((name) => [name, linearRgb(t[name])]));
  const pairs = BAR_TOKENS.flatMap((a, i) => BAR_TOKENS.slice(i + 1).map((b) => [a, b] as const));

  it("are inside sRGB, so what the tests measure is what the screen shows", () => {
    for (const name of BAR_TOKENS) {
      expect({ name, inGamut: rgb[name].every((v) => v >= -0.0005 && v <= 1.0005) }).toEqual({ name, inGamut: true });
    }
  });

  // WCAG 1.4.11: a bar is the only mark for its civilisation or war, so it needs 3:1 against the page.
  it("each reach 3:1 on the background", () => {
    for (const name of BAR_TOKENS) {
      expect({ name, ok: contrast(rgb[name], linearRgb(t.background)) >= 3 }).toEqual({ name, ok: true });
    }
  });

  // Regions sit side by side in the year panel, chips and search, and wars beside civilisations on a country chart.
  it("are each clearly apart from every other one", () => {
    for (const [a, b] of pairs) {
      expect({ a, b, ok: deltaE(rgb[a], rgb[b]) >= MIN_DELTA_E }).toEqual({ a, b, ok: true });
    }
  });

  it.each(Object.keys(CVD) as (keyof typeof CVD)[])("stay apart for someone with %s", (kind) => {
    for (const [a, b] of pairs) {
      const d = deltaE(simulate(rgb[a], CVD[kind]), simulate(rgb[b], CVD[kind]));
      expect({ a, b, ok: d >= MIN_CVD_DELTA_E }).toEqual({ a, b, ok: true });
    }
  });
});
