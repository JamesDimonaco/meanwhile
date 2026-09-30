import { describe, expect, it } from "vitest";
import { validateDataset, type DataFile } from "./validate";

const src = { citation: "Test source" };
const registry = {
  cultures: [
    { id: "shang", region: "china", label: "Shang" },
    { id: "inca", region: "south-america", label: "Inca" },
  ],
};

function cultureJson(id: string, region: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    region,
    wikidataId: "Q1",
    name: { en: id, es: id, zh: id },
    description: { en: "d", es: "d", zh: "d" },
    reviewed: { es: false, zh: false },
    periods: [
      { id: "main", earliestStart: -1600, latestStart: -1550, earliestEnd: -1050, latestEnd: -1000, sources: [src], default: true },
    ],
    events: Array.from({ length: 5 }, (_, i) => ({
      id: `e${i}`,
      start: -1500 + i,
      type: "ruler",
      title: { en: "t", es: "t", zh: "t" },
      sources: [src, src],
    })),
    facts: [{ id: "f", text: { en: "f", es: "f", zh: "f" }, start: -1500, end: -1400, sources: [src] }],
    ...overrides,
  };
}

const popular = { cultures: ["shang"] };

const file = (region: string, id: string, data: unknown): DataFile => ({
  path: `data/cultures/${region}/${id}.json`,
  data,
});

describe("validateDataset", () => {
  it("accepts a valid dataset", () => {
    const result = validateDataset({
      registry,
      cultureFiles: [file("china", "shang", cultureJson("shang", "china"))],
      borderFiles: [],
      popular,
    });
    expect(result.errors).toEqual([]);
    expect(result.cultures.map((c) => c.id)).toEqual(["shang"]);
  });

  it("rejects missing English text", () => {
    const bad = cultureJson("shang", "china", { name: { es: "Shang", zh: "商" } });
    const { errors } = validateDataset({ registry, cultureFiles: [file("china", "shang", bad)], borderFiles: [], popular });
    expect(errors.join("\n")).toMatch(/shang\.json.*name\.en/);
  });

  it("rejects duplicate culture ids across files", () => {
    const { errors } = validateDataset({
      registry,
      cultureFiles: [
        file("china", "shang", cultureJson("shang", "china")),
        { path: "data/cultures/china/shang-copy.json", data: cultureJson("shang", "china") },
      ],
      borderFiles: [],
      popular,
    });
    expect(errors.join("\n")).toMatch(/duplicate culture id "shang"/);
  });

  it("rejects an id that is not in the registry", () => {
    const { errors } = validateDataset({
      registry,
      cultureFiles: [file("china", "xia", cultureJson("xia", "china"))],
      borderFiles: [],
      popular,
    });
    expect(errors.join("\n")).toMatch(/"xia" is not in data\/registry\.json/);
  });

  it("rejects a file whose name or folder disagrees with its contents", () => {
    const { errors } = validateDataset({
      registry,
      cultureFiles: [{ path: "data/cultures/europe/shang.json", data: cultureJson("shang", "china") }],
      borderFiles: [],
      popular,
    });
    expect(errors.join("\n")).toMatch(/should live at data\/cultures\/china\/shang\.json/);
  });

  it("rejects duplicate event ids and a missing default period", () => {
    const events = cultureJson("shang", "china").events;
    const bad = cultureJson("shang", "china", {
      events: [...events, events[0]],
      periods: [{ ...cultureJson("shang", "china").periods[0], default: false }],
    });
    const { errors } = validateDataset({ registry, cultureFiles: [file("china", "shang", bad)], borderFiles: [], popular });
    const text = errors.join("\n");
    expect(text).toMatch(/duplicate event id "e0"/);
    expect(text).toMatch(/exactly one period must be default/);
  });

  it("rejects a period whose fuzzy edges are out of order", () => {
    const bad = cultureJson("shang", "china", {
      periods: [{ id: "main", earliestStart: -1500, latestStart: -1600, earliestEnd: -1050, latestEnd: -1000, sources: [src], default: true }],
    });
    const { errors } = validateDataset({ registry, cultureFiles: [file("china", "shang", bad)], borderFiles: [], popular });
    expect(errors.join("\n")).toMatch(/earliestStart <= latestStart/);
  });

  it("warns, but does not fail, on missing translations and unwritten registry cultures", () => {
    const partial = cultureJson("shang", "china", { description: { en: "d" } });
    const result = validateDataset({ registry, cultureFiles: [file("china", "shang", partial)], borderFiles: [], popular });
    expect(result.errors).toEqual([]);
    expect(result.warnings.join("\n")).toMatch(/shang.*missing es/);
    expect(result.warnings.join("\n")).toMatch(/no file yet: inca/);
  });

  it("checks border files point at a registered culture", () => {
    const borders = {
      cultureId: "carthage",
      sources: [src],
      snapshots: [
        {
          year: -200,
          polities: [
            {
              id: "carthage",
              label: { en: "Carthage" },
              role: "self",
              geometry: { type: "Polygon", coordinates: [[[10, 36], [11, 36], [11, 37], [10, 36]]] },
            },
          ],
        },
      ],
    };
    const { errors } = validateDataset({
      registry,
      cultureFiles: [],
      borderFiles: [{ path: "data/borders/carthage.json", data: borders }],
      popular,
    });
    expect(errors.join("\n")).toMatch(/"carthage" is not in data\/registry\.json/);
  });

  describe("popular starting points", () => {
    const both = [file("china", "shang", cultureJson("shang", "china")), file("south-america", "inca", cultureJson("inca", "south-america"))];
    const run = (ids: string[]) => validateDataset({ registry, cultureFiles: both, borderFiles: [], popular: { cultures: ids } });

    it("returns them in the order data/popular.json lists them, not id order", () => {
      const result = run(["shang", "inca"]);
      expect(result.errors).toEqual([]);
      expect(result.popular.map((c) => c.id)).toEqual(["shang", "inca"]);
    });

    it("rejects an id that is not in the registry", () => {
      expect(run(["shang", "xia"]).errors.join("\n")).toMatch(/data\/popular\.json: "xia" is not in data\/registry\.json/);
    });

    it("rejects a registered id with no culture file, which the home page could not render", () => {
      const { errors } = validateDataset({
        registry,
        cultureFiles: [both[0]],
        borderFiles: [],
        popular: { cultures: ["shang", "inca"] },
      });
      expect(errors.join("\n")).toMatch(/data\/popular\.json: "inca" has no culture file/);
    });

    it("rejects a duplicate id", () => {
      expect(run(["shang", "shang"]).errors.join("\n")).toMatch(/data\/popular\.json: duplicate id "shang"/);
    });
  });
});
