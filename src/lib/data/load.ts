import fs from "node:fs";
import path from "node:path";
import type { Borders, Culture } from "./schema";
import { validateDataset, type DataFile, type DatasetResult } from "./validate";

// Build-time only (fs). Pages call these in server components; client
// components receive CultureRef/Culture props, never this module.

const DATA_DIR = path.join(process.cwd(), "data");

function readJsonFiles(dir: string): DataFile[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { recursive: true, encoding: "utf8" })
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => {
      const full = path.join(dir, f);
      return {
        path: path.relative(process.cwd(), full).split(path.sep).join("/"),
        data: JSON.parse(fs.readFileSync(full, "utf8")) as unknown,
      };
    });
}

export function readDataset(): DatasetResult {
  return validateDataset({
    registry: JSON.parse(fs.readFileSync(path.join(DATA_DIR, "registry.json"), "utf8")) as unknown,
    cultureFiles: readJsonFiles(path.join(DATA_DIR, "cultures")),
    borderFiles: readJsonFiles(path.join(DATA_DIR, "borders")),
  });
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

export function loadCulture(id: string): Culture {
  const culture = dataset().cultures.find((c) => c.id === id);
  if (!culture) throw new Error(`No culture "${id}"`);
  return culture;
}

export function hasTerritoryMap(id: string): boolean {
  return dataset().borders.some((b) => b.cultureId === id);
}

export function loadBorders(id: string): Borders {
  const borders = dataset().borders.find((b) => b.cultureId === id);
  if (!borders) throw new Error(`No borders for "${id}"`);
  return borders;
}
