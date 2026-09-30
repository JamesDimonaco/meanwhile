import { describe, expect, it } from "vitest";
import type { Region } from "@/lib/data/schema";
import { includesRegion, normalizeSelection, parseRegionsParam, regionsIn, regionsParam, toggleRegion } from "./region-filter";

const available: Region[] = ["china", "south-america", "mesoamerica", "europe"];

describe("regionsIn", () => {
  it("lists only regions that have a culture, in REGIONS order", () => {
    const cultures = [{ region: "europe" as const }, { region: "china" as const }, { region: "europe" as const }];
    expect(regionsIn(cultures)).toEqual(["china", "europe"]);
  });
});

describe("?regions= <-> selection", () => {
  it("reads no parameter as no opinion, so the stored choice applies", () => {
    expect(parseRegionsParam(null, available)).toBeNull();
  });

  it("reads a comma list into a selection in display order", () => {
    expect(parseRegionsParam("europe,china", available)).toEqual(["china", "europe"]);
  });

  it("drops unknown and repeated regions from a hand-edited or stale link", () => {
    expect(parseRegionsParam("china,atlantis,china", available)).toEqual(["china"]);
  });

  it("treats a link naming no known region, or every region, as All", () => {
    expect(parseRegionsParam("atlantis", available)).toEqual([]);
    expect(parseRegionsParam("", available)).toEqual([]);
    expect(parseRegionsParam("europe,mesoamerica,south-america,china", available)).toEqual([]);
  });

  it("drops a region the data no longer has", () => {
    expect(parseRegionsParam("china,europe", ["china", "south-america"])).toEqual(["china"]);
  });

  it("writes All as no parameter and a selection as a canonical comma list", () => {
    expect(regionsParam([])).toBeNull();
    expect(regionsParam(["china", "europe"])).toBe("china,europe");
  });

  it("round-trips any selection through the URL unchanged", () => {
    for (const selection of [[], ["china"], ["south-america", "europe"], ["china", "mesoamerica", "europe"]] as Region[][]) {
      expect(parseRegionsParam(regionsParam(selection) ?? "", available)).toEqual(selection);
    }
  });
});

describe("toggleRegion", () => {
  it("narrows All to the tapped region", () => {
    expect(toggleRegion([], "europe", available)).toEqual(["europe"]);
  });

  it("adds and removes regions, keeping display order", () => {
    expect(toggleRegion(["europe"], "china", available)).toEqual(["china", "europe"]);
    expect(toggleRegion(["china", "europe"], "china", available)).toEqual(["europe"]);
  });

  it("goes back to All when the last region is removed or every region is picked", () => {
    expect(toggleRegion(["europe"], "europe", available)).toEqual([]);
    expect(toggleRegion(["china", "south-america", "mesoamerica"], "europe", available)).toEqual([]);
  });
});

describe("includesRegion", () => {
  it("lets everything through on All and only picked regions otherwise", () => {
    expect(includesRegion([], "europe")).toBe(true);
    expect(includesRegion(["china"], "china")).toBe(true);
    expect(includesRegion(["china"], "europe")).toBe(false);
  });
});

describe("normalizeSelection", () => {
  it("ignores stored values that are not regions", () => {
    expect(normalizeSelection(["europe", "42", "EUROPE"], available)).toEqual(["europe"]);
  });
});
