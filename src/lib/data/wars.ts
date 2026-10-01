import type { WarFile } from "./war-schema";

type Dated = Pick<WarFile, "period" | "ongoing">;

/** Every year the war could span: [earliestStart, latestEnd], an ongoing war running to its asOf year. */
export function warOuter(war: Dated): [number, number] {
  if (war.period) return [war.period.earliestStart, war.period.latestEnd];
  if (war.ongoing) return [war.ongoing.earliestStart, Number(war.ongoing.asOf.slice(0, 4))];
  throw new Error("a war needs a period or ongoing");
}

/** The dates a row shows: the likely start, and the likely end or null while it goes on. */
export function warSpan(war: Dated): { start: number; end: number | null } {
  if (war.period) return { start: war.period.latestStart, end: war.period.earliestEnd };
  if (war.ongoing) return { start: war.ongoing.latestStart, end: null };
  throw new Error("a war needs a period or ongoing");
}
