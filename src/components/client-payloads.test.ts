import { describe, expect, it } from "vitest";
import { readDataset } from "@/lib/data/load";
import type { Culture } from "@/lib/data/schema";
import { toCultureRef } from "@/lib/data/queries";
import { toSearchEntry } from "./search/search-index";
import { toTimelineCulture } from "./timeline/timeline-layout";

// These shapes are serialised into page payloads for weak signal: sources and
// notes are never rendered from them, so they must stay on the server.

const LEAKS = ["sources", "note", "periodoId"];

function keysIn(value: unknown, found = new Set<string>()): Set<string> {
  if (Array.isArray(value)) for (const v of value) keysIn(v, found);
  else if (value !== null && typeof value === "object") {
    for (const [key, v] of Object.entries(value)) {
      found.add(key);
      keysIn(v, found);
    }
  }
  return found;
}

const { cultures } = readDataset();

describe("client payloads", () => {
  it("start from data that has every leak to lose", () => {
    const all = keysIn(cultures);
    for (const key of LEAKS) expect(all).toContain(key);
  });

  it.each<[string, (culture: Culture) => unknown]>([
    ["search entries (home search box)", toSearchEntry],
    ["timeline cultures", (culture) => toTimelineCulture(culture, "en")],
    ["culture refs (event world, year panel)", toCultureRef],
  ])("%s carry no sources or notes", (_, toPayload) => {
    const keys = keysIn(cultures.map(toPayload));
    for (const key of LEAKS) expect(keys).not.toContain(key);
  });
});
