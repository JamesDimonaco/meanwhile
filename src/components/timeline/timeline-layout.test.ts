import { describe, expect, it } from "vitest";
import type { Culture } from "@/lib/data/schema";
import { CULTURE_ROW_HEIGHT, HEADER_ROW_HEIGHT, layoutRows } from "./timeline-layout";

function culture(id: string, region: Culture["region"], earliestStart: number): Culture {
  return {
    id,
    region,
    wikidataId: "Q1",
    name: { en: id },
    aliases: [],
    description: { en: id },
    reviewed: { es: false, zh: false },
    periods: [
      {
        id: "p",
        earliestStart,
        latestStart: earliestStart,
        earliestEnd: earliestStart + 100,
        latestEnd: earliestStart + 100,
        sources: [{ citation: "x" }],
        default: true,
        disputed: false,
      },
    ],
    phases: [],
    events: [],
    facts: [],
  };
}

describe("layoutRows", () => {
  it("groups by region in REGIONS order, each with a header row, skipping empty regions", () => {
    const cultures = [culture("shang", "china", -1500), culture("inca", "south-america", 1200)];
    const { rows } = layoutRows(cultures);
    expect(rows.map((r) => (r.kind === "region" ? `region:${r.region}` : `culture:${r.culture.id}`))).toEqual([
      "region:china",
      "culture:shang",
      "region:south-america",
      "culture:inca",
    ]);
  });

  it("orders cultures within a region by earliest start, then id", () => {
    const cultures = [culture("qin", "china", -221), culture("shang", "china", -1600), culture("han", "china", -206)];
    const { rows } = layoutRows(cultures);
    expect(rows.filter((r) => r.kind === "culture").map((r) => r.culture.id)).toEqual(["shang", "qin", "han"]);
  });

  it("stacks rows with no gaps or overlaps, using the pinned row heights", () => {
    const cultures = [culture("a", "china", -100), culture("b", "china", -50)];
    const { rows, totalHeight } = layoutRows(cultures);
    expect(rows.map((r) => r.y)).toEqual([0, HEADER_ROW_HEIGHT, HEADER_ROW_HEIGHT + CULTURE_ROW_HEIGHT]);
    expect(totalHeight).toBe(HEADER_ROW_HEIGHT + 2 * CULTURE_ROW_HEIGHT);
  });

  it("returns no rows and zero height for an empty dataset", () => {
    expect(layoutRows([])).toEqual({ rows: [], totalHeight: 0 });
  });
});
