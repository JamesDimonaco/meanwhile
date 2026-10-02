import fs from "node:fs";
import path from "node:path";
import { Blob as FontBlob, Face } from "harfbuzzjs";
import { describe, expect, it } from "vitest";
import { LOCALES } from "@/i18n/locales";
import { loadMessages } from "@/i18n/messages";
import { loadAllWars, loadCultures } from "@/lib/data/load";
import { ogText } from "./copy";

function codepoints(file: string): Set<number> {
  const bytes = fs.readFileSync(path.join(process.cwd(), "assets/og-fonts", file));
  return new Set(new Face(new FontBlob(bytes)).collectUnicodes());
}

describe("share image fonts", () => {
  // satori draws a character it has no glyph for as nothing, so a missing one
  // is a hole in a preview, not an error anywhere.
  it("cover every character any share image draws, in every locale (else run pnpm build-og-fonts)", async () => {
    const regular = codepoints("inter-regular.ttf");
    const semibold = codepoints("inter-semibold.ttf");
    const cjk = codepoints("noto-sans-sc-og.otf");
    const cultures = loadCultures();
    const wars = loadAllWars();
    const missing = new Set<string>();
    for (const locale of LOCALES) {
      for (const text of ogText(locale, await loadMessages(locale), cultures, wars)) {
        for (const ch of text) {
          const cp = ch.codePointAt(0)!;
          if (!cjk.has(cp) && !(regular.has(cp) && semibold.has(cp))) missing.add(ch);
        }
      }
    }
    expect([...missing].sort().join("")).toBe("");
  });
});
