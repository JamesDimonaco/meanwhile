import { describe, expect, it } from "vitest";
import { answerJsonSchema, decideScan, type ModelAnswer } from "./answer";

const IDS = new Set(["shang", "rome", "moche"]);

function answer(over: Partial<ModelAnswer>): ModelAnswer {
  return { cultureId: null, year: null, language: "en", text: "", confidence: "high", ...over };
}

describe("decideScan", () => {
  it("goes to the culture page when the id is in the catalogue", () => {
    const r = decideScan(answer({ cultureId: "shang", language: "zh-Hans", text: "商代 青铜鼎" }), IDS);
    expect(r.destination).toEqual({ kind: "culture", id: "shang" });
    expect(r.reading.text).toBe("商代 青铜鼎");
  });

  it("drops an id outside the catalogue, whatever the placard asked for", () => {
    const r = decideScan(answer({ cultureId: "../../admin", year: null }), IDS);
    expect(r.destination).toEqual({ kind: "none" });
  });

  it("converts a BCE year to astronomical in code (1300 BCE = -1299)", () => {
    const r = decideScan(
      answer({ year: { start: { value: 1300, era: "BCE" }, end: { value: 1300, era: "BCE" } } }),
      IDS,
    );
    expect(r.reading.year).toEqual({ start: -1299, end: -1299 });
    expect(r.destination).toEqual({ kind: "year", year: -1299 });
  });

  it("converts a CE range and aims the timeline at its middle (2nd century CE)", () => {
    const r = decideScan(
      answer({ year: { start: { value: 101, era: "CE" }, end: { value: 200, era: "CE" } } }),
      IDS,
    );
    expect(r.reading.year).toEqual({ start: 101, end: 200 });
    expect(r.destination).toEqual({ kind: "year", year: 150 });
  });

  it("handles a range across the era boundary (100 BCE - 100 CE)", () => {
    const r = decideScan(
      answer({ year: { start: { value: 100, era: "BCE" }, end: { value: 100, era: "CE" } } }),
      IDS,
    );
    expect(r.reading.year).toEqual({ start: -99, end: 100 });
  });

  it("prefers the culture over the year when both were read", () => {
    const r = decideScan(
      answer({ cultureId: "rome", year: { start: { value: 101, era: "CE" }, end: { value: 200, era: "CE" } } }),
      IDS,
    );
    expect(r.destination).toEqual({ kind: "culture", id: "rome" });
    expect(r.reading.year).toEqual({ start: 101, end: 200 });
  });

  it("does not route on low confidence but keeps what was read", () => {
    const r = decideScan(
      answer({
        cultureId: "moche",
        confidence: "low",
        text: "cerámica mochica",
        year: { start: { value: 300, era: "CE" }, end: { value: 300, era: "CE" } },
      }),
      IDS,
    );
    expect(r.destination).toEqual({ kind: "none" });
    expect(r.reading.text).toBe("cerámica mochica");
    expect(r.reading.year).toEqual({ start: 300, end: 300 });
  });

  it("routes on medium confidence", () => {
    expect(decideScan(answer({ cultureId: "moche", confidence: "medium" }), IDS).destination).toEqual({
      kind: "culture",
      id: "moche",
    });
  });

  it("returns none when nothing was read", () => {
    expect(decideScan(answer({}), IDS)).toEqual({
      destination: { kind: "none" },
      reading: { text: "", language: "en", year: null },
    });
  });

  it("ignores impossible years: year 0, negative, or a reversed range", () => {
    for (const year of [
      { start: { value: 0, era: "CE" as const }, end: { value: 0, era: "CE" as const } },
      { start: { value: -5, era: "BCE" as const }, end: { value: 5, era: "CE" as const } },
      { start: { value: 200, era: "CE" as const }, end: { value: 100, era: "CE" as const } },
    ]) {
      expect(decideScan(answer({ year }), IDS).reading.year).toBeNull();
    }
  });

  it("keeps the transcription to one short plain line and the language to a BCP 47 tag", () => {
    const r = decideScan(
      answer({ text: `line one\n\u0000line two ${"x".repeat(500)}`, language: "zh-Hans\" onload=\"x" }),
      IDS,
    );
    expect(r.reading.text).not.toMatch(/[\n\u0000]/);
    expect(r.reading.text.length).toBeLessThanOrEqual(200);
    expect(r.reading.text.startsWith("line one line two")).toBe(true);
    expect(r.reading.language).toBe("und");
  });
});

describe("answerJsonSchema", () => {
  it("limits cultureId to the catalogue ids or null", () => {
    const schema = answerJsonSchema(["rome", "shang"]);
    expect(schema).toMatchObject({
      type: "object",
      additionalProperties: false,
      properties: { cultureId: { anyOf: [{ type: "string", enum: ["rome", "shang"] }, { type: "null" }] } },
    });
  });
});
