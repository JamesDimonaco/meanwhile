import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const css = fs.readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");

function tokens(selector: string): Record<string, [number, number, number]> {
  const block = css.match(new RegExp(`^${selector.replace(".", "\\.")} \\{([\\s\\S]*?)^\\}`, "m"))?.[1];
  if (!block) throw new Error(`no ${selector} block`);
  const out: Record<string, [number, number, number]> = {};
  for (const [, name, l, c, h] of block.matchAll(/--([\w-]+): oklch\(([\d.]+) ([\d.]+) ([\d.]+)\);/g)) {
    out[name] = [Number(l), Number(c), Number(h)];
  }
  return out;
}

/** WCAG relative luminance of an OKLCH colour, via linear sRGB (clipped to gamut). */
function luminance([L, C, H]: [number, number, number]): number {
  const a = C * Math.cos((H * Math.PI) / 180);
  const b = C * Math.sin((H * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const clip = (v: number) => Math.min(1, Math.max(0, v));
  const r = clip(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s);
  const g = clip(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s);
  const bl = clip(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s);
  return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
}

const contrast = (x: [number, number, number], y: [number, number, number]) => {
  const [hi, lo] = [luminance(x), luminance(y)].sort((p, q) => q - p);
  return (hi + 0.05) / (lo + 0.05);
};

describe("timeline bar colours", () => {
  // WCAG 1.4.11: a bar is the only mark for its civilisation or war, so it needs 3:1 against the page.
  it.each([":root", ".dark"])("in %s, every region colour and the war colour reach 3:1 on the background", (selector) => {
    const t = tokens(selector);
    for (const name of ["chart-1", "chart-2", "chart-3", "chart-4", "chart-5", "war"]) {
      expect({ name, ratio: contrast(t[name], t.background) >= 3 }).toEqual({ name, ratio: true });
    }
  });
});
