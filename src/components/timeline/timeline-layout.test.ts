import { describe, expect, it } from "vitest";
import { loadAllWars, loadCulture } from "@/lib/data/load";
import type { Culture, Region } from "@/lib/data/schema";
import {
  BAR_ROW_HEIGHT,
  CULTURE_ROW_HEIGHT,
  HEADER_ROW_HEIGHT,
  layoutCountryRows,
  layoutRows,
  toTimelineBar,
  toTimelineCulture,
  type TimelineBar,
  type TimelineCulture,
} from "./timeline-layout";

function culture(id: string, region: Region, earliestStart: number): TimelineCulture {
  return {
    id,
    region,
    name: id,
    period: {
      earliestStart,
      latestStart: earliestStart,
      earliestEnd: earliestStart + 100,
      latestEnd: earliestStart + 100,
      disputed: false,
    },
    phases: [],
    events: [],
  };
}

describe("layoutRows", () => {
  it("groups by region in REGIONS order, each with a header row, skipping empty regions", () => {
    const cultures = [culture("shang", "china", -1500), culture("inca", "south-america", 1200)];
    const { rows } = layoutRows(cultures);
    expect(rows.map((r) => (r.kind === "header" ? `region:${r.group}` : `culture:${r.item.id}`))).toEqual([
      "region:china",
      "culture:shang",
      "region:south-america",
      "culture:inca",
    ]);
  });

  it("orders cultures within a region by earliest start, then id", () => {
    const cultures = [culture("qin", "china", -221), culture("shang", "china", -1600), culture("han", "china", -206)];
    const { rows } = layoutRows(cultures);
    expect(rows.flatMap((r) => (r.kind === "item" ? [r.item.id] : []))).toEqual(["shang", "qin", "han"]);
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

function fullCulture(): Culture {
  return {
    id: "carolingian",
    region: "europe",
    wikidataId: "Q1747689",
    name: { en: "Carolingian Empire", es: "Imperio carolingio", zh: "加洛林帝国" },
    aliases: [],
    description: { en: "desc" },
    reviewed: { es: false, zh: false },
    periods: [
      {
        id: "p",
        earliestStart: -100,
        latestStart: 0,
        earliestEnd: 100,
        latestEnd: 200,
        sources: [{ citation: "Library of Congress Subject Headings, via PeriodO." }],
        periodoId: "p0z5nvht7jr",
        default: true,
        disputed: true,
        note: { en: "Start dates vary by what is counted." },
      },
    ],
    phases: [],
    events: [
      {
        id: "e1",
        start: 50,
        type: "founding",
        title: { en: "Coronation", es: "Coronación", zh: "加冕" },
        sources: [{ citation: "a" }, { citation: "b" }],
        disputed: false,
      },
    ],
    facts: [{ id: "f1", text: { en: "x" }, start: 0, end: 1, sources: [{ citation: "a" }], disputed: false }],
  };
}

describe("toTimelineCulture", () => {
  it("keeps only the fields the chart draws, dropping sources, notes and periodoId", () => {
    const timeline = toTimelineCulture(fullCulture(), "en");
    expect(timeline).toEqual({
      id: "carolingian",
      region: "europe",
      name: "Carolingian Empire",
      period: { earliestStart: -100, latestStart: 0, earliestEnd: 100, latestEnd: 200, disputed: true },
      phases: [],
      events: [{ id: "e1", start: 50, type: "founding", title: "Coronation", disputed: false }],
    });
  });

  it("localizes name and event titles to a single plain string in the requested locale", () => {
    const timeline = toTimelineCulture(fullCulture(), "zh");
    expect(timeline.name).toBe("加洛林帝国");
    expect(timeline.events[0].title).toBe("加冕");
  });

  it("falls back to English when a locale's text is missing", () => {
    const noEs = { ...fullCulture(), name: { en: "English Only" } };
    expect(toTimelineCulture(noEs, "es").name).toBe("English Only");
  });
});

function bar(id: string, kind: TimelineBar["kind"]): TimelineBar {
  const period = { earliestStart: 0, latestStart: 0, earliestEnd: 1, latestEnd: 1, disputed: false };
  return { kind, id, name: id, region: kind === "culture" ? "china" : null, period, phases: [], asOf: null };
}

describe("layoutCountryRows", () => {
  it("puts civilisations, then wars, each under its own header, keeping the given date order", () => {
    const { rows, totalHeight } = layoutCountryRows([bar("qin", "culture"), bar("w1", "war"), bar("han", "culture")]);
    expect(rows.map((r) => (r.kind === "header" ? r.group : r.item.id))).toEqual(["cultures", "qin", "han", "wars", "w1"]);
    expect(totalHeight).toBe(2 * HEADER_ROW_HEIGHT + 3 * BAR_ROW_HEIGHT);
  });

  it("leaves out a group with nothing in it", () => {
    expect(layoutCountryRows([bar("w1", "war")]).rows.map((r) => r.kind)).toEqual(["header", "item"]);
  });

  // Every row is a tap target that opens a page: smaller than a fingertip and taps land on the wrong row.
  it("gives each bar a finger-sized row", () => {
    expect(BAR_ROW_HEIGHT).toBeGreaterThanOrEqual(32);
  });
});

describe("toTimelineBar", () => {
  it("keeps a culture's name, region, default period and phases, nothing else", () => {
    const rome = toTimelineBar({ kind: "culture", culture: loadCulture("rome") }, "es");
    expect(Object.keys(rome).sort()).toEqual(["asOf", "id", "kind", "name", "period", "phases", "region"]);
    expect(rome).toMatchObject({ kind: "culture", id: "rome", region: "europe", asOf: null, name: "Antigua Roma" });
    expect(rome.phases.map((p) => Object.keys(p).sort())).toEqual(rome.phases.map(() => ["end", "id", "start"]));
  });

  it("draws an ongoing war solid to its asOf year and keeps the asOf date for its label", () => {
    const war = loadAllWars().find((w) => w.ongoing);
    if (!war?.ongoing) throw new Error("the data has an ongoing war");
    const asOfYear = Number(war.ongoing.asOf.slice(0, 4));
    const timeline = toTimelineBar({ kind: "war", war }, "en");
    expect(timeline).toMatchObject({ kind: "war", region: null, asOf: war.ongoing.asOf });
    expect(timeline.period).toEqual({
      earliestStart: war.ongoing.earliestStart,
      latestStart: war.ongoing.latestStart,
      earliestEnd: asOfYear,
      latestEnd: asOfYear,
      disputed: war.ongoing.disputed ?? false,
    });
  });
});
