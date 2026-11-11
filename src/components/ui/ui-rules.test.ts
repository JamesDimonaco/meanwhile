import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buttonVariants } from "./button";

function sources(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sources(full);
    return /\.tsx$/.test(entry.name) ? [full] : [];
  });
}

const files = sources(path.join(process.cwd(), "src")).map((file) => ({
  file: path.relative(process.cwd(), file),
  text: fs.readFileSync(file, "utf8"),
}));
const offenders = (pattern: RegExp) => files.filter(({ text }) => pattern.test(text)).map(({ file }) => file);

describe("app-wide UI rules", () => {
  // Sentence case everywhere: CSS must not shout a label the messages wrote in sentence case.
  it("never upper-cases text with CSS", () => {
    expect(offenders(/["'\s`]uppercase["'\s`]/)).toEqual([]);
  });

  // Share images (next/og) are drawn, not read on the page, so they are exempt.
  it("keeps text at 12px or more", () => {
    const pages = files.filter(({ file }) => !file.includes("opengraph-image"));
    expect(pages.filter(({ text }) => /text-\[(?:9|10|11)px\]|text-\[0\.[0-7]\d*rem\]/.test(text)).map(({ file }) => file)).toEqual([]);
  });

  it("gives default and small buttons 36px and 32px, and 44px under a finger", () => {
    expect(buttonVariants({ size: "default" })).toMatch(/\bh-9\b/);
    expect(buttonVariants({ size: "sm" })).toMatch(/\bh-8\b/);
    for (const size of ["default", "sm", "lg", "icon", "icon-sm"] as const) {
      expect(buttonVariants({ size })).toMatch(/pointer-coarse:(?:min-h|size)-11/);
    }
  });
});
