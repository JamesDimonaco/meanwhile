import { defaultPeriod, eventWorld } from "@/lib/data/queries";
import type { Culture, CultureEvent, Period, Phase } from "@/lib/data/schema";

/** An event plus the ids of the other cultures alive that year; names come from the search entries. */
export type CompareEvent = CultureEvent & { world: { id: string; certain: boolean }[] };

/**
 * What the compare screen needs for one culture, served as its own static
 * JSON file so the page fetches just the two or three it shows.
 */
export type CompareCulture = Pick<Culture, "id" | "region" | "name" | "nativeName"> & {
  period: Pick<Period, "earliestStart" | "latestStart" | "earliestEnd" | "latestEnd" | "disputed" | "note">;
  phases: Pick<Phase, "id" | "name" | "start" | "end">[];
  events: CompareEvent[];
};

export function compareDataUrl(id: string): string {
  return `/culture-data/${id}.json`;
}

export function toCompareCulture(culture: Culture, cultures: readonly Culture[]): CompareCulture {
  const { earliestStart, latestStart, earliestEnd, latestEnd, disputed, note } = defaultPeriod(culture);
  const world = eventWorld(culture, cultures);
  return {
    id: culture.id,
    region: culture.region,
    name: culture.name,
    nativeName: culture.nativeName,
    period: { earliestStart, latestStart, earliestEnd, latestEnd, disputed, note },
    phases: culture.phases.map(({ id, name, start, end }) => ({ id, name, start, end })),
    events: culture.events.map((event) => ({
      ...event,
      world: (world[event.id] ?? []).map((a) => ({ id: a.culture.id, certain: a.certain })),
    })),
  };
}
