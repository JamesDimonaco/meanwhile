import { describe, expect, it } from "vitest";
import { pageAlternates } from "./seo";

describe("pageAlternates", () => {
  it("sends x-default to the root language chooser for the home page only", () => {
    expect(pageAlternates("es", "").languages["x-default"]).toBe("/");
    expect(pageAlternates("es", "credits").languages["x-default"]).toBe("/en/credits/");
  });
});
