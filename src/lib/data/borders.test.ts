import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { readDataset } from "./load";

// A culture or war with a borders file gets the scroll-linked map: every event
// pins its place on it (war events always have one, by schema), and the
// borders file loads on a phone on weak signal.
const MAX_BORDERS_BYTES = 300 * 1024;

describe("territory map data", () => {
  const { cultures, borders } = readDataset();

  const owners = borders.map((b) => b.cultureId ?? b.warId);

  it.each(borders.flatMap((b) => b.cultureId ?? []))("%s: every event has a place to pin", (id) => {
    const culture = cultures.find((c) => c.id === id);
    expect(culture, `culture file for ${id}`).toBeDefined();
    expect(culture?.events.filter((e) => !e.place).map((e) => e.id)).toEqual([]);
  });

  // A snapshot may have no self polity when the land was someone else's
  // province (Persian and Roman Egypt); the schema already rejects an empty one.
  it.each(owners)("%s: its own lands on some map, under 300 KB", (id) => {
    const file = borders.find((b) => (b.cultureId ?? b.warId) === id);
    expect(file?.snapshots.some((s) => s.polities.some((p) => p.role === "self"))).toBe(true);
    const bytes = fs.statSync(path.join(process.cwd(), "data/borders", `${id}.json`)).size;
    expect(bytes).toBeLessThanOrEqual(MAX_BORDERS_BYTES);
  });
});
