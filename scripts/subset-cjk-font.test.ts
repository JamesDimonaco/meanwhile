import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { woff2CodePoints } from "./woff2-cmap";

const ROOT = process.cwd();
const css = fs.readFileSync(path.join(ROOT, "src/app/globals.css"), "utf8");
const font = (file: string) => woff2CodePoints(fs.readFileSync(path.join(ROOT, "public/fonts", file)));

/** The code points in the unicode-range of the @font-face that loads `file`. */
function unicodeRange(file: string): Set<number> {
  const range = css.match(new RegExp(`@font-face \\{[^}]*/fonts/${file}"[^}]*unicode-range: ([^;]+);`))?.[1];
  if (!range) throw new Error(`no @font-face with a unicode-range loads ${file}`);
  const out = new Set<number>();
  for (const part of range.split(",")) {
    const [from, to = from] = part.trim().replace(/^U\+/, "").split("-").map((hex) => parseInt(hex, 16));
    for (let cp = from; cp <= to; cp++) out.add(cp);
  }
  return out;
}

function strings(value: unknown, out: string[]): string[] {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) for (const item of value) strings(item, out);
  else if (value && typeof value === "object")
    // A source's url is an href, never drawn.
    for (const [key, v] of Object.entries(value)) if (key !== "url") strings(v, out);
  return out;
}

/** Every Han character a page can draw from messages/zh and data/**. */
function shownHan(): Set<string> {
  const texts: string[] = [];
  for (const dir of ["messages/zh", "data"]) {
    for (const file of fs.readdirSync(path.join(ROOT, dir), { recursive: true, encoding: "utf8" })) {
      if (file.endsWith(".json")) strings(JSON.parse(fs.readFileSync(path.join(ROOT, dir, file), "utf8")), texts);
    }
  }
  return new Set(texts.join("").match(/\p{Script=Han}/gu));
}

// Noto Sans SC has no glyph for these, so no subset can carry them; they show in the system font.
// 𣴓: 北𣴓 (Bắc Kạn), the zh-wiki name, in first-indochina-war.
const NOT_IN_NOTO_SANS_SC = new Set(["𣴓"]);

describe("the Chinese web font", () => {
  const main = font("noto-sans-sc-subset.woff2");
  const wars = font("noto-sans-sc-wars.woff2");
  const warsRange = unicodeRange("noto-sans-sc-wars.woff2");

  // A character neither subset has is drawn in whatever CJK font the system has, mid-sentence beside Noto (else run pnpm subset-cjk-font).
  it("covers every Han character in messages/zh and data with one of its two subsets", () => {
    const missing = [...shownHan()].filter((ch) => {
      const cp = ch.codePointAt(0)!;
      return !main.has(cp) && !(wars.has(cp) && warsRange.has(cp)) && !NOT_IN_NOTO_SANS_SC.has(ch);
    });
    expect(missing.join("")).toBe("");
  });

  // The browser fetches the war subset only for a character in its unicode-range: a character missing from the range
  // falls back to the main subset, which lacks it; one the file lacks downloads it for nothing.
  it("declares the war subset for exactly the characters it has", () => {
    expect([...warsRange].sort((a, b) => a - b)).toEqual([...wars].sort((a, b) => a - b));
  });

  it("lists only characters still shown and still missing from Noto Sans SC as exceptions", () => {
    const shown = shownHan();
    for (const ch of NOT_IN_NOTO_SANS_SC) {
      expect(shown.has(ch)).toBe(true);
      expect(main.has(ch.codePointAt(0)!) || wars.has(ch.codePointAt(0)!)).toBe(false);
    }
  });
});
