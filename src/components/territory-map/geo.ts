import { geoArea } from "d3-geo";
import type { Geometry } from "@/lib/data/schema";

type PolygonRings = Extract<Geometry, { type: "Polygon" }>["coordinates"];

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
