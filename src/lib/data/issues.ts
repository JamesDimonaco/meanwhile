import type { z } from "zod";

type Issue = z.ZodError["issues"][number];

/** One "<file>: <field path>: <message>" line per zod issue. */
export function issues(path: string, error: z.ZodError): string[] {
  return error.issues.flatMap(closest).map((i) => `${path}: ${i.path.join(".") || "(root)"}: ${i.message}`);
}

// A union that matches no option says only "Invalid input". The option with
// the fewest issues is almost always the one the author meant (a war event
// missing its place, not a malformed culture event reference), so report that.
function closest(issue: Issue): Issue[] {
  if (issue.code !== "invalid_union" || issue.errors.length === 0) return [issue];
  const nearest = issue.errors.reduce((a, b) => (b.length < a.length ? b : a));
  return nearest.flatMap((i) => closest({ ...i, path: [...issue.path, ...i.path] }));
}

/** Counts LocalizedText objects (anything with a string "en") lacking a locale. */
export function countMissing(value: unknown, locale: "es" | "zh"): number {
  if (Array.isArray(value)) return value.reduce((n: number, v) => n + countMissing(v, locale), 0);
  if (value === null || typeof value !== "object") return 0;
  const record = value as Record<string, unknown>;
  if (typeof record.en === "string") return typeof record[locale] === "string" ? 0 : 1;
  return Object.values(record).reduce((n: number, v) => n + countMissing(v, locale), 0);
}
