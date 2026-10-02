import { describe, expect, it } from "vitest";
import { LOCALES } from "@/i18n/locales";
import { countryCodes, countryItems } from "@/lib/data/country";
import { loadAllWars, loadHeartland, loadWars, readDataset } from "@/lib/data/load";
import type { Culture } from "@/lib/data/schema";
import { toCultureRef } from "@/lib/data/queries";
import { toSearchEntry, warSearchEntries } from "./search/search-index";
import { toTimelineBar, toTimelineCulture } from "./timeline/timeline-layout";

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

  it("war search entries (home and wars search) carry no account, sides, sources or notes", () => {
    const wars = loadAllWars();
    for (const key of [...LEAKS.slice(0, 2), "description", "sides"]) expect(keysIn(wars)).toContain(key);
    const keys = keysIn(warSearchEntries(wars, "en"));
    for (const key of [...LEAKS, "description", "sides", "events"]) expect(keys).not.toContain(key);
  });

  // What a country page's timeline ships: names, years, colours and ids, built the way the page builds them.
  describe.each(LOCALES)("country timeline bars in %s", (locale) => {
    const heartland = loadHeartland();
    const wars = loadWars(locale);
    const bars = countryCodes(heartland, wars).flatMap((code) =>
      countryItems(code, cultures, heartland, wars).map((item) => toTimelineBar(item, locale)),
    );

    it("carry no account, sides, events, sources or notes", () => {
      const keys = keysIn(bars);
      for (const key of [...LEAKS, "description", "outcome", "sides", "events", "facts", "casualties"]) expect(keys).not.toContain(key);
    });

    it("carry no war the review gate hides here", () => {
      const hidden = loadAllWars().filter((w) => w.sensitive && locale !== "en" && !w.reviewed[locale]).map((w) => w.id);
      if (locale !== "en") expect(hidden.length).toBeGreaterThan(0);
      for (const id of hidden) expect(bars.map((b) => b.id)).not.toContain(id);
    });
  });
});
