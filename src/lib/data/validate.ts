import { landMaps } from "@/lib/map/land";
import { countMissing, issues } from "./issues";
import { defaultPeriod, likelyRange } from "./queries";
import { Borders, Culture, Popular, Registry, Succession, duplicates, type SuccessionLink } from "./schema";
import { validateLand } from "./validate-land";
import { validateWars } from "./validate-wars";
import type { War } from "./war-schema";

export type DataFile = { path: string; data: unknown };
export type DatasetInput = {
  registry: unknown;
  cultureFiles: DataFile[];
  borderFiles: DataFile[];
  popular: unknown;
  /** Contents of data/succession.json; omitted means no links. */
  succession?: unknown;
  /** data/wars/*.json; omitted means no wars. */
  warFiles?: DataFile[];
  /** public/geo/land/*.json; omitted skips the check that every map has a land file cut for its frame. */
  landFiles?: DataFile[];
  /** YYYY-MM-DD; omitted means latestDateOnEarth(). */
  buildDate?: string;
};
export type DatasetResult = {
  errors: string[];
  warnings: string[];
  cultures: Culture[];
  borders: Borders[];
  /** Home page starting points, in data/popular.json order. */
  popular: Culture[];
  succession: SuccessionLink[];
  wars: War[];
};

/** UTC+14 (Kiribati's Line Islands) is the furthest-ahead time zone. */
const LATEST_UTC_OFFSET_HOURS = 14;

/**
 * The newest calendar date anywhere on Earth right now. An ongoing war's asOf
 * is the day its author checked in their own time zone, so the future check
 * compares against this rather than the UTC date, which lags a writer east of
 * Greenwich by up to a day.
 */
export function latestDateOnEarth(now: Date = new Date()): string {
  return new Date(now.getTime() + LATEST_UTC_OFFSET_HOURS * 3_600_000).toISOString().slice(0, 10);
}

/** Pure so it can be tested; scripts/validate-data.ts feeds it the files on disk. */
export function validateDataset(input: DatasetInput): DatasetResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const registry = Registry.safeParse(input.registry);
  if (!registry.success) {
    return {
      errors: issues("data/registry.json", registry.error),
      warnings,
      cultures: [],
      borders: [],
      popular: [],
      succession: [],
      wars: [],
    };
  }
  const regions = new Map(registry.data.cultures.map((c) => [c.id, c.region]));
  for (const dup of duplicates(registry.data.cultures.map((c) => c.id))) {
    errors.push(`data/registry.json: duplicate id "${dup}"`);
  }
  const notRegistered = (path: string, id: string) =>
    `${path}: "${id}" is not in data/registry.json (add it there first so ids stay agreed)`;

  const cultures: Culture[] = [];
  for (const file of input.cultureFiles) {
    const parsed = Culture.safeParse(file.data);
    if (!parsed.success) {
      errors.push(...issues(file.path, parsed.error));
      continue;
    }
    const c = parsed.data;
    const expected = `data/cultures/${c.region}/${c.id}.json`;
    if (file.path !== expected) errors.push(`${file.path}: should live at ${expected}`);
    const registered = regions.get(c.id);
    if (!registered) errors.push(notRegistered(file.path, c.id));
    else if (registered !== c.region) errors.push(`${file.path}: region "${c.region}" but registry says "${registered}"`);
    for (const locale of ["es", "zh"] as const) {
      const missing = countMissing(file.data, locale);
      if (missing > 0) warnings.push(`${c.id}: missing ${locale} in ${missing} text(s), English shown instead`);
    }
    cultures.push(c);
  }
  for (const dup of duplicates(cultures.map((c) => c.id))) {
    errors.push(`duplicate culture id "${dup}"`);
  }
  const written = new Set(cultures.map((c) => c.id));
  const unwritten = registry.data.cultures.filter((c) => !written.has(c.id)).map((c) => c.id);
  if (unwritten.length > 0) warnings.push(`registry cultures with no file yet: ${unwritten.join(", ")}`);

  const borders: Borders[] = [];
  const warBorders: (Borders & { path: string })[] = [];
  for (const file of input.borderFiles) {
    const parsed = Borders.safeParse(file.data);
    if (!parsed.success) {
      errors.push(...issues(file.path, parsed.error));
      continue;
    }
    const b = parsed.data;
    const owner = b.cultureId ?? b.warId;
    const expected = `data/borders/${owner}.json`;
    if (file.path !== expected) errors.push(`${file.path}: should live at ${expected}`);
    if (b.cultureId !== undefined && !regions.has(b.cultureId)) errors.push(notRegistered(file.path, b.cultureId));
    if (b.warId !== undefined) warBorders.push({ ...b, path: file.path });
    borders.push(b);
  }

  const popular: Culture[] = [];
  const popularList = Popular.safeParse(input.popular);
  if (!popularList.success) {
    errors.push(...issues("data/popular.json", popularList.error));
  } else {
    for (const dup of duplicates(popularList.data.cultures)) errors.push(`data/popular.json: duplicate id "${dup}"`);
    for (const id of popularList.data.cultures) {
      const culture = cultures.find((c) => c.id === id);
      if (culture) popular.push(culture);
      else if (!regions.has(id)) errors.push(notRegistered("data/popular.json", id));
      else errors.push(`data/popular.json: "${id}" has no culture file yet, so the home page can't show it`);
    }
  }

  const SUCCESSION_PATH = "data/succession.json";
  const parsedSuccession = Succession.safeParse(input.succession ?? []);
  const succession = parsedSuccession.success ? parsedSuccession.data : [];
  if (!parsedSuccession.success) errors.push(...issues(SUCCESSION_PATH, parsedSuccession.error));
  const byId = new Map(cultures.map((c) => [c.id, c]));
  for (const dup of duplicates(succession.map((l) => `${l.from} -> ${l.to}`))) {
    errors.push(`${SUCCESSION_PATH}: duplicate link ${dup}`);
  }
  for (const link of succession) {
    for (const id of [link.from, link.to]) if (!regions.has(id)) errors.push(notRegistered(SUCCESSION_PATH, id));
    const from = byId.get(link.from);
    const to = byId.get(link.to);
    if (from && to && likelyRange(defaultPeriod(to))[0] < likelyRange(defaultPeriod(from))[0]) {
      errors.push(`${SUCCESSION_PATH}: ${link.from} -> ${link.to}: "${link.to}" starts before "${link.from}"`);
    }
  }

  const wars = validateWars({
    warFiles: input.warFiles ?? [],
    registryIds: new Set(regions.keys()),
    cultures,
    borders: warBorders,
    buildDate: input.buildDate ?? latestDateOnEarth(),
  });
  errors.push(...wars.errors);
  warnings.push(...wars.warnings);

  if (input.landFiles) {
    const land = validateLand(input.landFiles, landMaps(borders, wars.wars));
    errors.push(...land.errors);
    warnings.push(...land.warnings);
  }

  cultures.sort((a, b) => (a.id < b.id ? -1 : 1));
  return { errors, warnings, cultures, borders, popular, succession, wars: wars.wars };
}
