import { describe, expect, it } from "vitest";
import { readDataset } from "./load";

// Rome is the flagship: its phases segment one bar, which the schema can't check.
const PHASES = ["kingdom", "republic", "empire", "eastern"];

function must<T>(value: T | undefined, what: string): T {
  if (value === undefined) throw new Error(`missing ${what}`);
  return value;
}

describe("rome flagship data", () => {
  const { cultures } = readDataset();

  it("has the four phases as contiguous segments of one bar", () => {
    const rome = must(cultures.find((c) => c.id === "rome"), "data/cultures/europe/rome.json");
    expect(rome.phases.map((p) => p.id)).toEqual(PHASES);
    for (let i = 1; i < rome.phases.length; i++) {
      expect(rome.phases[i].start).toBe(rome.phases[i - 1].end);
    }
  });
});
