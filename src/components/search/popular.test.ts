import { describe, expect, it } from "vitest";
import type { Culture } from "@/lib/data/schema";
import { MAX_POPULAR, popularStartingPoints } from "./popular";

function culture(id: string, region: Culture["region"]): Culture {
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
        earliestStart: -100,
        latestStart: -90,
        earliestEnd: 90,
        latestEnd: 100,
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

describe("popularStartingPoints", () => {
  it("caps the list at the limit", () => {
    const many = Array.from({ length: 20 }, (_, i) => culture(`china-${i}`, "china"));
    expect(popularStartingPoints(many)).toHaveLength(MAX_POPULAR);
  });

  it("spreads across regions before repeating one, so one region can't fill the whole shortlist", () => {
    const cultures = [
      culture("china-a", "china"),
      culture("china-b", "china"),
      culture("europe-a", "europe"),
    ];
    const result = popularStartingPoints(cultures, 2);
    const regions = new Set(result.map((c) => c.region));
    // With only 2 slots and 2 regions represented, both must appear —
    // a broken round-robin that exhausts one region first would return
    // china-a, china-b instead.
    expect(regions).toEqual(new Set(["china", "europe"]));
  });

  it("is deterministic: same input, same order every time", () => {
    const cultures = [culture("b", "china"), culture("a", "china"), culture("z", "europe")];
    expect(popularStartingPoints(cultures).map((c) => c.id)).toEqual(
      popularStartingPoints(cultures).map((c) => c.id),
    );
  });

  it("never returns more than the available cultures", () => {
    const cultures = [culture("only-one", "china")];
    expect(popularStartingPoints(cultures)).toHaveLength(1);
  });
});
