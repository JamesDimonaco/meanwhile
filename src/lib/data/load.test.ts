import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadAllWars, loadWars } from "./load";
import { isShownIn } from "./wars";

describe("loadWars", () => {
  const all = loadAllWars();

  it.each(["es", "zh"] as const)("leaves out every war the review gate hides in %s", (locale) => {
    const hidden = all.filter((w) => !isShownIn(w, locale)).map((w) => w.id);
    expect(hidden.length).toBeGreaterThan(0);
    const ids = loadWars(locale).map((w) => w.id);
    for (const id of hidden) expect(ids).not.toContain(id);
    expect(ids).toHaveLength(all.length - hidden.length);
  });

  it("gives every war in English", () => {
    expect(loadWars("en")).toEqual(all);
  });
});

// A page that read the ungated list would ship a gated war's title on es and
// zh pages. Only callers that need every language at once may.
it("lets only the sitemap and the borders route read the ungated list", () => {
  const files = ["src/app", "src/components"].flatMap((dir) =>
    fs
      .readdirSync(dir, { recursive: true, encoding: "utf8" })
      .filter((f) => /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f))
      .map((f) => path.join(dir, f).split(path.sep).join("/")),
  );
  const callers = files.filter((f) => fs.readFileSync(f, "utf8").includes("loadAllWars"));
  expect(callers.sort()).toEqual(["src/app/geo/borders/[file]/route.ts", "src/app/sitemap.ts"]);
});
