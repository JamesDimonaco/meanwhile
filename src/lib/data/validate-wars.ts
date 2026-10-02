import { contestedAreaAt } from "./contested";
import { isListableCountry, NEVER_SHOWN } from "./countries";
import { countMissing, issues } from "./issues";
import type { DataFile } from "./validate";
import type { Borders, Culture } from "./schema";
import { REVIEWED, SENSITIVE_WARS } from "./war-review";
import { MIN_FLAGSHIP_PHASES, TIER_EVENTS, WarFile, type War, type WarEvent } from "./war-schema";
import { warOuter } from "./wars";

/** Polygons only for flagship wars over by this year; later wars get pins on plain land. */
export const LAST_BORDERS_YEAR = 1800;

export type WarsInput = {
  warFiles: DataFile[];
  registryIds: ReadonlySet<string>;
  cultures: readonly Culture[];
  /** Border files that name a warId. */
  borders: readonly (Borders & { path: string })[];
  /** YYYY-MM-DD: an ongoing war can't have been checked later than this. */
  buildDate: string;
};

/** Pure so it can be tested; validateDataset feeds it the files on disk. */
export function validateWars({ warFiles, registryIds, cultures, borders, buildDate }: WarsInput): {
  errors: string[];
  warnings: string[];
  wars: War[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  const wars: War[] = [];
  const culturesById = new Map(cultures.map((c) => [c.id, c]));

  for (const file of warFiles) {
    const parsed = WarFile.safeParse(file.data);
    if (!parsed.success) {
      errors.push(...issues(file.path, parsed.error));
      continue;
    }
    const { events: listed, ...w } = parsed.data;
    const at = file.path;
    const expected = `data/wars/${w.id}.json`;
    if (file.path !== expected) errors.push(`${at}: should live at ${expected}`);
    if (registryIds.has(w.id)) errors.push(`${at}: "${w.id}" is a culture id; pick another war id`);
    if (SENSITIVE_WARS.has(w.id) && !w.sensitive) errors.push(`${at}: ${w.id} is on the sensitive list (war-review.ts); set "sensitive": true`);
    for (const locale of ["es", "zh"] as const) {
      if (w.reviewed[locale] && !REVIEWED.has(`${w.id}:${locale}`)) {
        errors.push(`${at}: reviewed.${locale} is true, but only James signs a language off, in war-review.ts; set it false`);
      }
    }
    if (w.ongoing && w.ongoing.asOf > buildDate) errors.push(`${at}: asOf ${w.ongoing.asOf} is after the build date ${buildDate}`);

    const checkCulture = (id: string) => {
      if (culturesById.has(id)) return;
      errors.push(
        registryIds.has(id) ? `${at}: "${id}" has no culture file yet, so its link would 404` : `${at}: "${id}" is not in data/registry.json`,
      );
    };
    for (const side of w.sides) {
      for (const member of side.members) {
        if (member.kind === "culture") checkCulture(member.id);
        const codes = member.kind === "state" ? [member.code, ...member.today] : member.today;
        for (const code of new Set(codes)) {
          const problem = countryProblem(code);
          if (problem) errors.push(`${at}: side ${side.id}: ${problem}`);
        }
      }
    }
    w.cultures.forEach(checkCulture);

    const events: WarEvent[] = [];
    for (const item of listed) {
      if (!("culture" in item)) {
        events.push(item);
        continue;
      }
      const ref = item;
      const event = culturesById.get(ref.culture)?.events.find((e) => e.id === ref.event);
      if (!event) {
        errors.push(`${at}: ${ref.culture} has no event "${ref.event}"`);
        continue;
      }
      if (!event.place) {
        errors.push(`${at}: ${ref.culture} event "${ref.event}" has no place to pin; add one in the culture file`);
        continue;
      }
      events.push({
        id: event.id,
        start: event.start,
        end: event.end,
        title: event.title,
        sources: event.sources,
        disputed: event.disputed,
        note: event.note,
        place: event.place,
      });
    }
    // Stable: within a year the file order is the order things happened.
    events.sort((a, b) => a.start - b.start);

    const [min, max] = TIER_EVENTS[w.tier];
    if (events.length < min || events.length > max) {
      errors.push(`${at}: ${w.tier} wars have ${min}-${max} events; this has ${events.length}`);
    }
    if (w.tier === "flagship" && w.phases.length < MIN_FLAGSHIP_PHASES) {
      errors.push(`${at}: flagship wars need at least ${MIN_FLAGSHIP_PHASES} phases`);
    }

    const [from, to] = warOuter(w);
    for (const p of w.phases) {
      if (p.start < from || p.end > to) errors.push(`${at}: phase "${p.id}" (${p.start}-${p.end}) is outside the war (${from} to ${to})`);
    }
    for (const e of events) {
      const end = e.end ?? e.start;
      if (e.start < from || end > to) {
        const when = e.end === undefined ? `${e.start}` : `${e.start}-${e.end}`;
        errors.push(`${at}: event "${e.id}" (${when}) is outside the war (${from} to ${to})`);
      }
      const area = contestedAreaAt(e.place.lon, e.place.lat);
      if (area) errors.push(`${at}: event "${e.id}" is pinned inside a contested area (${area}); pin a city outside it`);
    }

    for (const locale of ["es", "zh"] as const) {
      const missing = countMissing(file.data, locale);
      if (missing > 0) warnings.push(`war ${w.id}: missing ${locale} in ${missing} text(s), English shown instead`);
    }
    wars.push({ ...w, events });
  }

  const seen = new Set<string>();
  for (const w of wars) {
    if (seen.has(w.id)) errors.push(`duplicate war id "${w.id}"`);
    seen.add(w.id);
  }
  const byId = new Map(wars.map((w) => [w.id, w]));
  for (const w of wars) {
    if (!w.follows) continue;
    const before = byId.get(w.follows);
    if (!before) errors.push(`data/wars/${w.id}.json: follows "${w.follows}", which has no file`);
    else if (warOuter(before)[0] > warOuter(w)[0]) errors.push(`data/wars/${w.id}.json: ${w.id} follows "${w.follows}", which starts later`);
  }

  for (const b of borders) {
    const war = b.warId === undefined ? undefined : byId.get(b.warId);
    if (!war) {
      errors.push(`${b.path}: "${b.warId}" is not a war id`);
      continue;
    }
    if (war.tier !== "flagship") errors.push(`${b.path}: ${war.id} is standard tier; only flagship wars get polygons`);
    if (warOuter(war)[1] > LAST_BORDERS_YEAR || war.ongoing) {
      errors.push(`${b.path}: ${war.id} ends after ${LAST_BORDERS_YEAR}; later wars get pins only, no polygons`);
    }
  }

  wars.sort((a, b) => (a.id < b.id ? -1 : 1));
  return { errors, warnings, wars };
}

function countryProblem(code: string): string | null {
  if (NEVER_SHOWN.has(code)) return `"${code}" is never shown (disputed or politically loaded)`;
  if (!isListableCountry(code)) return `"${code}" is not a UN member state`;
  return null;
}
