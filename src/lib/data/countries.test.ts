import { describe, expect, it } from "vitest";
import countries from "flag-icons/country.json";
import { CONTINENTS, COUNTRY_ALIASES, ENGLISH_ALIASES, NEVER_SHOWN, UN_MEMBERS, isListableCountry } from "./countries";

describe("UN member states", () => {
  it("lists exactly the 193 UN members", () => {
    expect(Object.keys(UN_MEMBERS)).toHaveLength(193);
  });

  it("uses real ISO 3166-1 alpha-2 codes", () => {
    const iso = new Set(countries.filter((c) => c.iso).map((c) => c.code.toUpperCase()));
    for (const code of Object.keys(UN_MEMBERS)) expect(iso.has(code), code).toBe(true);
  });

  it("puts every member in a known continent", () => {
    for (const continent of Object.values(UN_MEMBERS)) expect(CONTINENTS).toContain(continent);
  });

  it("leaves out observers and disputed territories", () => {
    for (const code of ["TW", "HK", "MO", "EH", "PS", "XK", "VA"]) expect(code in UN_MEMBERS, code).toBe(false);
  });

  it("never shows Kosovo alongside the codes the heartland check already hid", () => {
    expect([...NEVER_SHOWN].sort()).toEqual(["EH", "HK", "MO", "PS", "TW", "XK"]);
  });

  it("lists a UN member that is not on the never-shown list, and nothing else", () => {
    expect(isListableCountry("MX")).toBe(true);
    expect(isListableCountry("TW")).toBe(false);
    expect(isListableCountry("XK")).toBe(false);
    expect(isListableCountry("VA")).toBe(false);
    expect(isListableCountry("mx")).toBe(false);
  });
});

describe("country aliases", () => {
  // An alias on a never-shown or non-member code would put that code in search.
  it("only name countries the site may list", () => {
    for (const code of [...Object.keys(COUNTRY_ALIASES), ...Object.keys(ENGLISH_ALIASES)]) expect(isListableCountry(code), code).toBe(true);
  });
});
