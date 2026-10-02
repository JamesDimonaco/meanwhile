import fs from "node:fs";
import path from "node:path";
import countries from "flag-icons/country.json";
import type { Locale } from "@/i18n/locales";
import { readJsonFiles } from "./files";
import { validateHeartland } from "./heartland";
import { Registry, type Borders, type Culture, type SuccessionLink } from "./schema";
import { validateDataset, type DatasetResult } from "./validate";
import type { War } from "./war-schema";
import { localeGaps, warCountryCodes, warsShownIn } from "./wars";

// Server only (fs). Pages call these at build time, in server components;
// client components receive CultureRef/Culture props, never this module.
// The one request-time caller, POST /api/scan, reads files.ts instead.

const DATA_DIR = path.join(process.cwd(), "data");

const readJson = (file: string) => JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), "utf8")) as unknown;

export function readDataset(): DatasetResult {
  const registry = readJson("registry.json");
  const result = validateDataset({
    registry,
    cultureFiles: readJsonFiles(path.join(DATA_DIR, "cultures")),
    borderFiles: readJsonFiles(path.join(DATA_DIR, "borders")),
    popular: readJson("popular.json"),
    succession: readJson("succession.json"),
    warFiles: readJsonFiles(path.join(DATA_DIR, "wars")),
  });
  const heartlandErrors = validateHeartland({
    today: readJson("today.json"),
    registryIds: Registry.safeParse(registry).data?.cultures.map((c) => c.id) ?? [],
    isoCodes: countries.filter((c) => c.iso).map((c) => c.code.toUpperCase()),
    flagFiles: fs.readdirSync(path.join(process.cwd(), "public/flags")).filter((f) => f.endsWith(".svg")),
    warCodes: warCountryCodes(result.wars),
  });
  return { ...result, errors: [...result.errors, ...heartlandErrors] };
}

let cache: DatasetResult | undefined;

function dataset(): DatasetResult {
  if (!cache) {
    const result = readDataset();
    if (result.errors.length > 0) {
      throw new Error(`Invalid data (run pnpm validate-data):\n${result.errors.join("\n")}`);
    }
    cache = result;
  }
  return cache;
}

/** Every culture, sorted by id. */
export function loadCultures(): Culture[] {
  return dataset().cultures;
}

/** The home page's starting points, in data/popular.json order. */
export function loadPopular(): Culture[] {
  return dataset().popular;
}

export function loadCulture(id: string): Culture {
  const culture = dataset().cultures.find((c) => c.id === id);
  if (!culture) throw new Error(`No culture "${id}"`);
  return culture;
}

export function loadSuccession(): SuccessionLink[] {
  return dataset().succession;
}

/** The wars a page in this language may show (the review gate applied), sorted by id. */
export function loadWars(locale: Locale): War[] {
  return warsShownIn(dataset().wars, locale);
}

/** Every war in every language, gate not applied: for the sitemap, locale gaps, borders files, scripts and tests. */
export function loadAllWars(): War[] {
  return dataset().wars;
}

let gapsCache: Record<string, Locale[]> | undefined;

/** localeGaps(loadAllWars()), worked out once: the layout asks for it on every page in every locale. */
export function loadLocaleGaps(): Record<string, Locale[]> {
  gapsCache ??= localeGaps(loadAllWars());
  return gapsCache;
}

/** A culture or war id: both keep their maps in data/borders. */
export function hasTerritoryMap(id: string): boolean {
  return dataset().borders.some((b) => (b.cultureId ?? b.warId) === id);
}

export function loadBorders(id: string): Borders {
  const borders = dataset().borders.find((b) => (b.cultureId ?? b.warId) === id);
  if (!borders) throw new Error(`No borders for "${id}"`);
  return borders;
}
