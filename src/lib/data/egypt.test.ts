import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { readDataset } from "./load";

// Egypt is the second flagship: its events are pinned on the territory map and
// its borders file loads on a phone, so these guard what the schema can't.
const MAX_BORDERS_BYTES = 300 * 1024;
const PHASES = [
  "early-dynastic",
  "old-kingdom",
  "first-intermediate",
  "middle-kingdom",
  "second-intermediate",
  "new-kingdom",
  "third-intermediate",
  "late-period",
  "ptolemaic",
];
/** 3100 BCE and 30 BCE, astronomical: the museum span of "ancient Egypt". */
const SPAN = { start: -3099, end: -29 };

function must<T>(value: T | undefined, what: string): T {
  if (value === undefined) throw new Error(`missing ${what}`);
  return value;
}

describe("egypt flagship data", () => {
  const { cultures, borders } = readDataset();
  const egypt = () => must(cultures.find((c) => c.id === "egypt"), "data/cultures/africa/egypt.json");

  it("has the nine phases as contiguous segments of one bar from 3100 BCE to 30 BCE", () => {
    const { phases } = egypt();
    expect(phases.map((p) => p.id)).toEqual(PHASES);
    for (let i = 1; i < phases.length; i++) {
      expect(phases[i].start).toBe(phases[i - 1].end);
    }
    expect(phases[0].start).toBe(SPAN.start);
    expect(phases[phases.length - 1].end).toBe(SPAN.end);
  });

  it("gives every event a place so the map can pin it", () => {
    const unplaced = egypt()
      .events.filter((e) => !e.place)
      .map((e) => e.id);
    expect(unplaced).toEqual([]);
  });

  it("keeps the borders file small enough for weak signal and inside the culture's span", () => {
    const egyptBorders = must(borders.find((b) => b.cultureId === "egypt"), "data/borders/egypt.json");
    const years = egyptBorders.snapshots.map((s) => s.year);
    expect(years[0]).toBeGreaterThanOrEqual(SPAN.start);
    expect(years[years.length - 1]).toBeLessThanOrEqual(SPAN.end);
    const bytes = fs.statSync(path.join(process.cwd(), "data/borders/egypt.json")).size;
    expect(bytes).toBeLessThanOrEqual(MAX_BORDERS_BYTES);
  });
});
