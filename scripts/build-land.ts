/**
 * Regenerates public/geo/land/<id>.json, the coastline under one map, from
 * Natural Earth's 1:10m land layer (public domain). Each file is the land cut
 * to the box its map's frame can show and simplified to that frame's scale, so
 * a map zoomed to the Bosporus gets a coast drawn at a few hundred metres and
 * a map of the Roman Empire one drawn at ten kilometres, both a few KB.
 *
 *   1. Download ne_10m_land.zip (v5.1.1 was used) from
 *      https://naciscdn.org/naturalearth/10m/physical/ne_10m_land.zip
 *      and unzip it anywhere outside the repo (../wars-sources is the usual place).
 *   2. pnpm land <path/to/ne_10m_land.shp> [cultureId or warId ...]
 *
 * With no ids it rebuilds every map's file and deletes files no map uses.
 * The frame comes from src/lib/map/geo.ts, the same code the page draws with,
 * and validate-data fails when a map's pins or borders have moved outside its
 * file's cut. mapshaper runs through npx at a pinned version, so nothing is installed.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { readDataInput } from "../src/lib/data/load";
import type { Land } from "../src/lib/data/schema";
import { validateDataset } from "../src/lib/data/validate";
import { WHOLE_GLOBE } from "../src/lib/data/validate-land";
import type { LonLatBox } from "../src/lib/map/geo";
import { LAND_DIR, landFrame, landMaps, type LandMap } from "../src/lib/map/land";

const MAPSHAPER = ["-y", "mapshaper@0.7.69"];

/** Simplification interval in px: half a pixel keeps the coast true on 2x screens too. */
const SIMPLIFY_PX = 0.5;
/** Islands smaller than this many px across are dropped: they would draw as specks. */
const MIN_ISLAND_PX = 1.5;
/** Coordinates are rounded so the error is under this many px. */
const PRECISION_PX = 0.25;
/** Fraction of the frame's span cut beyond it on each side, so the frame's edge never meets the cut's. */
const CLIP_MARGIN = 0.02;
/** Metres per degree of latitude. */
const METRES_PER_DEGREE = 111_320;
/** A frame no box holds gets the whole globe: only at a near-global scale, where that stays small. */
const UNCUT_MIN_METRES_PER_PIXEL = 20_000;

type Feature = { geometry: { type: "Polygon" | "MultiPolygon"; coordinates: number[][][] | number[][][][] } | null };

function mapshaper(...args: string[]) {
  execFileSync("npx", [...MAPSHAPER, ...args], { stdio: ["ignore", "ignore", "pipe"] });
}

function clipBox([west, south, east, north]: LonLatBox): LonLatBox {
  const dx = (east - west) * CLIP_MARGIN;
  const dy = (north - south) * CLIP_MARGIN;
  return [Math.max(-180, west - dx), Math.max(-90, south - dy), Math.min(180, east + dx), Math.min(90, north + dy)];
}

/** The coarsest power of ten (in degrees) that still rounds within PRECISION_PX. */
function precisionFor(metresPerPixel: number): number {
  const degreesPerPixel = metresPerPixel / METRES_PER_DEGREE;
  let precision = 1;
  while (precision > degreesPerPixel * PRECISION_PX) precision /= 10;
  return precision;
}

function build(map: LandMap, shapefile: string, work: string): Land {
  const { bounds, metresPerPixel } = landFrame(map);
  if (!bounds && metresPerPixel < UNCUT_MIN_METRES_PER_PIXEL) {
    throw new Error(`${map.id}: the frame crosses the antimeridian or a pole at a scale that would make the uncut globe huge`);
  }
  const bbox = bounds ? clipBox(bounds) : WHOLE_GLOBE;
  const precision = precisionFor(metresPerPixel);
  const out = path.join(work, `${map.id}.json`);
  mapshaper(
    shapefile,
    ...(bounds ? ["-clip", `bbox=${bbox.join(",")}`] : []),
    "-filter-islands",
    `min-area=${Math.round((metresPerPixel * MIN_ISLAND_PX) ** 2)}`,
    "-simplify",
    `interval=${Math.round(metresPerPixel * SIMPLIFY_PX)}`,
    "-o",
    out,
    "format=geojson",
    `precision=${precision}`,
    "force",
  );
  const { features } = JSON.parse(fs.readFileSync(out, "utf8")) as { features: Feature[] };
  const coordinates = features.flatMap((f) => {
    if (!f.geometry) return [];
    const polygons = f.geometry.type === "Polygon" ? [f.geometry.coordinates as number[][][]] : (f.geometry.coordinates as number[][][][]);
    return polygons.map((rings) => rings.filter((ring) => ring.length >= 4)).filter((rings) => rings.length > 0);
  });
  if (coordinates.length === 0) throw new Error(`${map.id}: no land in frame`);
  const decimals = Math.max(0, -Math.log10(precision));
  return { type: "MultiPolygon", bbox: bbox.map((v) => Number(v.toFixed(decimals))) as LonLatBox, coordinates: coordinates as Land["coordinates"] };
}

function main() {
  const [shapefile, ...ids] = process.argv.slice(2);
  if (!shapefile) {
    console.error("usage: pnpm land <path/to/ne_10m_land.shp> [cultureId or warId ...]");
    process.exit(1);
  }
  const { errors, borders, wars } = validateDataset(readDataInput());
  if (errors.length > 0) {
    for (const e of errors) console.error(`error: ${e}`);
    process.exit(1);
  }
  const maps = landMaps(borders, wars);
  const wanted = ids.length > 0 ? maps.filter((m) => ids.includes(m.id)) : maps;
  for (const id of ids) if (!wanted.some((m) => m.id === id)) throw new Error(`No map for "${id}": a culture needs a borders file`);

  const work = fs.mkdtempSync(path.join(os.tmpdir(), "land-"));
  fs.mkdirSync(LAND_DIR, { recursive: true });
  for (const map of wanted) {
    const out = path.join(LAND_DIR, `${map.id}.json`);
    fs.writeFileSync(out, `${JSON.stringify(build(map, shapefile, work))}\n`);
    console.error(`wrote ${out}: ${Math.round(fs.statSync(out).size / 1024)} KB`);
  }
  fs.rmSync(work, { recursive: true });

  if (ids.length === 0) {
    const keep = new Set(maps.map((m) => `${m.id}.json`));
    for (const file of fs.readdirSync(LAND_DIR)) {
      if (keep.has(file)) continue;
      fs.rmSync(path.join(LAND_DIR, file));
      console.error(`deleted ${LAND_DIR}/${file}: no map uses it`);
    }
  }
}

main();
