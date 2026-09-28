import { z } from "zod";
import { fromDisplayYear } from "@/lib/years";

export const CONFIDENCES = ["high", "medium", "low"] as const;

const EraYear = z.strictObject({ value: z.number().int(), era: z.enum(["BCE", "CE"]) });

/** What the model may answer. Mirrors answerJsonSchema; re-checked because it arrives over the wire. */
export const ModelAnswer = z.strictObject({
  cultureId: z.string().nullable(),
  year: z.strictObject({ start: EraYear, end: EraYear }).nullable(),
  language: z.string(),
  text: z.string(),
  confidence: z.enum(CONFIDENCES),
});
export type ModelAnswer = z.infer<typeof ModelAnswer>;

export type ScanDestination =
  | { kind: "culture"; id: string }
  | { kind: "year"; year: number }
  | { kind: "none" };

export type ScanResult = {
  destination: ScanDestination;
  reading: {
    text: string;
    language: string;
    /** Astronomical years. */
    year: { start: number; end: number } | null;
  };
};

const ERA_YEAR_SCHEMA = {
  type: "object",
  properties: { value: { type: "integer" }, era: { type: "string", enum: ["BCE", "CE"] } },
  required: ["value", "era"],
  additionalProperties: false,
};

/** Structured-output schema: the model can only pick a culture from the catalogue, or null. */
export function answerJsonSchema(cultureIds: readonly string[]): Record<string, unknown> {
  return {
    type: "object",
    properties: {
      cultureId: { anyOf: [{ type: "string", enum: [...cultureIds] }, { type: "null" }] },
      year: {
        anyOf: [
          {
            type: "object",
            properties: { start: ERA_YEAR_SCHEMA, end: ERA_YEAR_SCHEMA },
            required: ["start", "end"],
            additionalProperties: false,
          },
          { type: "null" },
        ],
      },
      language: { type: "string" },
      text: { type: "string" },
      confidence: { type: "string", enum: [...CONFIDENCES] },
    },
    required: ["cultureId", "year", "language", "text", "confidence"],
    additionalProperties: false,
  };
}

const MAX_TEXT = 200;
const BCP47 = /^[a-z]{2,3}(-[a-z0-9]{2,8})*$/i;

function toAstronomical(y: z.infer<typeof EraYear>): number | null {
  return y.value >= 1 ? fromDisplayYear(y.value, y.era) : null;
}

function readYear(year: ModelAnswer["year"]): ScanResult["reading"]["year"] {
  if (!year) return null;
  const start = toAstronomical(year.start);
  const end = toAstronomical(year.end);
  return start !== null && end !== null && start <= end ? { start, end } : null;
}

export function decideScan(answer: ModelAnswer, cultureIds: ReadonlySet<string>): ScanResult {
  const reading = {
    text: answer.text.replace(/[\p{Cc}\s]+/gu, " ").trim().slice(0, MAX_TEXT),
    language: BCP47.test(answer.language) ? answer.language : "und",
    year: readYear(answer.year),
  };
  const cultureId = answer.cultureId !== null && cultureIds.has(answer.cultureId) ? answer.cultureId : null;

  let destination: ScanDestination = { kind: "none" };
  if (answer.confidence !== "low") {
    if (cultureId) destination = { kind: "culture", id: cultureId };
    else if (reading.year) destination = { kind: "year", year: Math.floor((reading.year.start + reading.year.end) / 2) };
  }
  return { destination, reading };
}
