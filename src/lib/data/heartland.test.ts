import { describe, expect, it } from "vitest";
import { validateHeartland } from "./heartland";

const registryIds = ["inca", "maya", "shang"];
const isoCodes = ["PE", "MX", "GT", "CN", "TW", "BZ", "HN"];
const today = { inca: ["PE"], maya: ["MX", "GT"], shang: ["CN"] };
const flagFiles = ["cn.svg", "gt.svg", "mx.svg", "pe.svg"];

const run = (overrides: Partial<Parameters<typeof validateHeartland>[0]> = {}) =>
  validateHeartland({ today, registryIds, isoCodes, flagFiles, ...overrides }).join("\n");

describe("validateHeartland (data/today.json)", () => {
  it("accepts a heartland for every registry culture, each with a shipped flag", () => {
    expect(run()).toBe("");
  });

  it("rejects a registry culture with no heartland, so no card goes without a flag", () => {
    expect(run({ today: { inca: ["PE"], maya: ["MX", "GT"] } })).toMatch(/"shang" has no entry/);
  });

  it("rejects an id that is not in the registry", () => {
    expect(run({ today: { ...today, xia: ["CN"] } })).toMatch(/"xia" is not in data\/registry\.json/);
  });

  it("rejects a code that is not ISO 3166-1 alpha-2", () => {
    expect(run({ today: { ...today, inca: ["UK"] } })).toMatch(/inca: "UK" is not an ISO 3166-1 alpha-2 code/);
    expect(run({ today: { ...today, inca: ["pe"] } })).toMatch(/inca/);
  });

  it("accepts England, Scotland and Wales, and no other subdivision", () => {
    const nations = { ...today, inca: ["GB-ENG", "GB-SCT", "GB-WLS"] };
    expect(run({ today: nations, flagFiles: ["cn.svg", "gt.svg", "mx.svg", "gb-eng.svg", "gb-sct.svg", "gb-wls.svg"] })).toBe("");
    for (const code of ["GB-NIR", "CN-XZ", "CN-XJ"]) {
      expect(run({ today: { ...today, inca: [code] } })).toMatch(new RegExp(`inca: "${code}" is not an ISO 3166-1 alpha-2 code`));
    }
  });

  it("rejects a disputed territory even though it has an ISO code", () => {
    expect(run({ today: { ...today, shang: ["TW"] }, flagFiles: [...flagFiles, "tw.svg"] })).toMatch(/shang: "TW"/);
  });

  it("allows at most three countries: a heartland, not the largest extent", () => {
    expect(run({ today: { ...today, maya: ["MX", "GT", "BZ"] }, flagFiles: [...flagFiles, "bz.svg"] })).toBe("");
    expect(
      run({ today: { ...today, maya: ["MX", "GT", "BZ", "HN"] }, flagFiles: [...flagFiles, "bz.svg", "hn.svg"] }),
    ).toMatch(/maya/);
    expect(run({ today: { ...today, inca: [] } })).toMatch(/inca/);
  });

  it("rejects a code listed twice for one culture", () => {
    expect(run({ today: { ...today, maya: ["MX", "MX"] } })).toMatch(/maya: "MX" listed twice/);
  });

  it("rejects Kosovo too", () => {
    expect(run({ today: { ...today, shang: ["XK"] }, isoCodes: [...isoCodes, "XK"], flagFiles: [...flagFiles, "xk.svg"] })).toMatch(
      /shang: "XK" is never shown/,
    );
  });

  it("counts the countries wars list as used flags", () => {
    expect(run({ flagFiles: [...flagFiles, "vn.svg"], warCodes: ["VN"] })).toBe("");
    expect(run({ warCodes: ["VN"] })).toMatch(/public\/flags\/vn\.svg is missing/);
  });

  it("needs a shipped flag for every code, and ships no flag nothing uses", () => {
    expect(run({ flagFiles: ["cn.svg", "gt.svg", "mx.svg"] })).toMatch(/public\/flags\/pe\.svg is missing/);
    expect(run({ flagFiles: [...flagFiles, "fr.svg"] })).toMatch(/public\/flags\/fr\.svg is not used/);
  });
});
