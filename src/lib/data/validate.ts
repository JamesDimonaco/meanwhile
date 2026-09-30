import type { z } from "zod";
import { defaultPeriod, likelyRange } from "./queries";
import { Borders, Culture, Popular, Registry, Succession, duplicates, type SuccessionLink } from "./schema";

export type DataFile = { path: string; data: unknown };
export type DatasetInput = {
  registry: unknown;
  cultureFiles: DataFile[];
  borderFiles: DataFile[];
  popular: unknown;
  /** Contents of data/succession.json; omitted means no links. */
  succession?: unknown;
};
export type DatasetResult = {
  errors: string[];
  warnings: string[];
  cultures: Culture[];
  borders: Borders[];
  /** Home page starting points, in data/popular.json order. */
  popular: Culture[];
  succession: SuccessionLink[];
};

function issues(path: string, error: z.ZodError): string[] {
  return error.issues.map((i) => `${path}: ${i.path.join(".") || "(root)"}: ${i.message}`);
}

/** Pure so it can be tested; scripts/validate-data.ts feeds it the files on disk. */
export function validateDataset(input: DatasetInput): DatasetResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const registry = Registry.safeParse(input.registry);
  if (!registry.success) {
    return { errors: issues("data/registry.json", registry.error), warnings, cultures: [], borders: [], popular: [], succession: [] };
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
  for (const file of input.borderFiles) {
    const parsed = Borders.safeParse(file.data);
    if (!parsed.success) {
      errors.push(...issues(file.path, parsed.error));
      continue;
    }
    const b = parsed.data;
    const expected = `data/borders/${b.cultureId}.json`;
    if (file.path !== expected) errors.push(`${file.path}: should live at ${expected}`);
    if (!regions.has(b.cultureId)) errors.push(notRegistered(file.path, b.cultureId));
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

  cultures.sort((a, b) => (a.id < b.id ? -1 : 1));
  return { errors, warnings, cultures, borders, popular, succession };
}

/** Counts LocalizedText objects (anything with a string "en") lacking a locale. */
function countMissing(value: unknown, locale: "es" | "zh"): number {
  if (Array.isArray(value)) return value.reduce((n: number, v) => n + countMissing(v, locale), 0);
  if (value === null || typeof value !== "object") return 0;
  const record = value as Record<string, unknown>;
  if (typeof record.en === "string") return typeof record[locale] === "string" ? 0 : 1;
  return Object.values(record).reduce((n: number, v) => n + countMissing(v, locale), 0);
}
