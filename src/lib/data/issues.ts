import type { z } from "zod";

/** One "<file>: <field path>: <message>" line per zod issue. */
export function issues(path: string, error: z.ZodError): string[] {
  return error.issues.map((i) => `${path}: ${i.path.join(".") || "(root)"}: ${i.message}`);
}

/** Counts LocalizedText objects (anything with a string "en") lacking a locale. */
export function countMissing(value: unknown, locale: "es" | "zh"): number {
  if (Array.isArray(value)) return value.reduce((n: number, v) => n + countMissing(v, locale), 0);
  if (value === null || typeof value !== "object") return 0;
  const record = value as Record<string, unknown>;
  if (typeof record.en === "string") return typeof record[locale] === "string" ? 0 : 1;
  return Object.values(record).reduce((n: number, v) => n + countMissing(v, locale), 0);
}
