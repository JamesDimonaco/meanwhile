import { geoArea, geoAzimuthalEqualArea, geoBounds, type GeoGeometryObjects, type GeoProjection } from "d3-geo";
import type { Borders, Geometry, Place } from "@/lib/data/schema";

// Shared by the map component, scripts/build-land.ts and validation, so the
// land file a map downloads is cut and simplified for exactly the frame it draws.

export const MAP_WIDTH = 400;
export const MAP_HEIGHT = 280;
/** Px between the frame's edge and the extent it is fitted to. */
const MAP_PADDING = 16;
/** Degrees of margin around the pins, so a single pin or a tight cluster still shows its surroundings. */
export const PIN_MARGIN = 3;
/** Mean Earth radius in metres: the projection's scale is px per unit sphere. */
const EARTH_RADIUS_M = 6_371_000;

type PolygonRings = Extract<Geometry, { type: "Polygon" }>["coordinates"];
/** d3's geometry types less the sphere, which a GeometryCollection can't hold. */
type GeoJsonGeometry = Exclude<GeoGeometryObjects, { type: "Sphere" }>;

/** The borders to draw for a year: the latest snapshot at or before it, none before the first. */
export function snapshotAt<S extends { year: number }>(snapshots: readonly S[], year: number): S | null {
  let found: S | null = null;
  for (const s of snapshots) {
    if (s.year > year) break;
    found = s;
  }
  return found;
}

/**
 * The middle of geoBounds' box. A box that crosses the antimeridian comes back
 * with west > east, so the plain average would point at the far side of the globe.
 */
export function boundsCentre([[west, south], [east, north]]: [[number, number], [number, number]]): [number, number] {
  const lon = (west + (west > east ? east + 360 : east)) / 2;
  return [lon > 180 ? lon - 360 : lon, (south + north) / 2];
}

/**
 * d3-geo draws on a sphere and takes ring direction to mean "inside": GeoJSON
 * written to RFC 7946 (counter-clockwise exteriors) reads as the whole globe
 * minus the shape. Flip any polygon whose exterior covers more than a hemisphere.
 */
export function forD3(geometry: Geometry): Geometry {
  if (geometry.type === "Polygon") return { type: "Polygon", coordinates: fixPolygon(geometry.coordinates) };
  return { type: "MultiPolygon", coordinates: geometry.coordinates.map(fixPolygon) };
}

function fixPolygon(rings: PolygonRings): PolygonRings {
  const exterior = geoArea({ type: "Polygon", coordinates: [rings[0]] });
  return exterior > 2 * Math.PI ? rings.map((r) => [...r].reverse()) : rings;
}

/** Everything a map keeps in frame: every "self" polity in every snapshot, and a margin around every pin. */
export function mapExtent(borders: Pick<Borders, "snapshots"> | null, pins: readonly Place[]): GeoGeometryObjects {
  const geometries: GeoJsonGeometry[] = (borders?.snapshots ?? []).flatMap((s) =>
    s.polities.filter((p) => p.role === "self").map((p) => forD3(p.geometry)),
  );
  if (pins.length > 0) {
    geometries.push({
      type: "MultiPoint",
      coordinates: pins.flatMap((p) => [
        [p.lon - PIN_MARGIN, p.lat - PIN_MARGIN],
        [p.lon + PIN_MARGIN, p.lat + PIN_MARGIN],
      ]),
    });
  }
  return { type: "GeometryCollection", geometries };
}

/**
 * Equal-area, centred on the extent and fitted inside the frame's padding, so
 * sizes compare fairly and the frame never moves between years.
 */
export function mapProjection(extent: GeoGeometryObjects): GeoProjection {
  const [lon, lat] = boundsCentre(geoBounds(extent));
  return geoAzimuthalEqualArea()
    .rotate([-lon, -lat])
    .fitExtent(
      [
        [MAP_PADDING, MAP_PADDING],
        [MAP_WIDTH - MAP_PADDING, MAP_HEIGHT - MAP_PADDING],
      ],
      extent,
    );
}

/** Ground distance one px covers at the middle of the map. */
export function metresPerPixel(projection: GeoProjection): number {
  return EARTH_RADIUS_M / projection.scale();
}

export type LonLatBox = [west: number, south: number, east: number, north: number];

/** Px between sampled points: finer than the simplification any land file keeps, so no coast slips between samples. */
const FRAME_SAMPLE_PX = 4;

/**
 * The lon/lat box of everything the frame can show, read off a grid of points
 * across it; null when no box holds it: the frame reaches off the globe, or
 * wraps more than half of it (a frame across the antimeridian or near a pole).
 */
export function frameBounds(projection: GeoProjection): LonLatBox | null {
  let west = Infinity;
  let south = Infinity;
  let east = -Infinity;
  let north = -Infinity;
  for (let x = 0; x <= MAP_WIDTH; x += FRAME_SAMPLE_PX) {
    for (let y = 0; y <= MAP_HEIGHT; y += FRAME_SAMPLE_PX) {
      const point = projection.invert?.([x, y]);
      if (!point || Number.isNaN(point[0]) || Number.isNaN(point[1])) return null;
      const [lon, lat] = point;
      west = Math.min(west, lon);
      east = Math.max(east, lon);
      south = Math.min(south, lat);
      north = Math.max(north, lat);
    }
  }
  return east - west > 180 ? null : [west, south, east, north];
}

export function boxContains(outer: LonLatBox, inner: LonLatBox): boolean {
  return outer[0] <= inner[0] && outer[1] <= inner[1] && outer[2] >= inner[2] && outer[3] >= inner[3];
}
