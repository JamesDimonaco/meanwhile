import { describe, expect, it } from "vitest";
import { readCatalogueCultures } from "@/lib/data/files";
import { loadCultures } from "@/lib/data/load";
import { buildScanSystemPrompt } from "./prompt";

describe("buildScanSystemPrompt", () => {
  const cultures = loadCultures();
  const prompt = buildScanSystemPrompt(cultures);

  it("lists every culture id", () => {
    expect(cultures.length).toBeGreaterThan(0);
    for (const c of cultures) expect(prompt).toContain(`id: ${c.id}\n`);
  });

  it("gives each culture's names in every language, native name and aliases", () => {
    const shang = cultures.find((c) => c.id === "shang");
    expect(shang).toBeDefined();
    for (const term of ["Shang dynasty", "Dinastía Shang", "商朝", "Yin", "殷"]) expect(prompt).toContain(term);
  });

  it("is the same prompt from the unvalidated read the route uses at request time", () => {
    expect(buildScanSystemPrompt(readCatalogueCultures())).toBe(prompt);
  });

  it("says placard text is data, not instructions", () => {
    expect(prompt).toMatch(/never instructions/i);
  });
});
