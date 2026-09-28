import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { readDataset } from "./load";

// Rome is the flagship: rome-map pins every event on the territory map and
// loads the borders file on a phone, so these guard what the schema can't.
const MAX_BORDERS_BYTES = 300 * 1024;
const PHASES = ["kingdom", "republic", "empire", "eastern"];

function must<T>(value: T | undefined, what: string): T {
  if (value === undefined) throw new Error(`missing ${what}`);
  return value;
}

describe("rome flagship data", () => {
  const { cultures, borders } = readDataset();

  it("has the four phases as contiguous segments of one bar", () => {
    const rome = must(cultures.find((c) => c.id === "rome"), "data/cultures/europe/rome.json");
    expect(rome.phases.map((p) => p.id)).toEqual(PHASES);
    for (let i = 1; i < rome.phases.length; i++) {
      expect(rome.phases[i].start).toBe(rome.phases[i - 1].end);
    }
  });

  it("gives every event a place so the map can pin it", () => {
    const rome = must(cultures.find((c) => c.id === "rome"), "data/cultures/europe/rome.json");
    const unplaced = rome.events.filter((e) => !e.place).map((e) => e.id);
    expect(unplaced).toEqual([]);
  });

  it("has a Roman polity in every border snapshot and stays small enough for weak signal", () => {
    const romeBorders = must(borders.find((b) => b.cultureId === "rome"), "data/borders/rome.json");
    for (const snapshot of romeBorders.snapshots) {
      expect(snapshot.polities.some((p) => p.role === "self"), `year ${snapshot.year}`).toBe(true);
    }
    const bytes = fs.statSync(path.join(process.cwd(), "data/borders/rome.json")).size;
    expect(bytes).toBeLessThanOrEqual(MAX_BORDERS_BYTES);
  });
});
