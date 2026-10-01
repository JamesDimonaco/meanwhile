import { geoArea } from "d3-geo";
import { describe, expect, it } from "vitest";
import { Borders, type Geometry } from "@/lib/data/schema";
import fixture from "./__fixtures__/borders.json";
import { boundsCentre, forD3, snapshotAt } from "./geo";

const snapshots = [{ year: -500 }, { year: -264 }, { year: 117 }];

describe("snapshotAt", () => {
  it("picks the nearest snapshot at or before the year", () => {
    expect(snapshotAt(snapshots, -300)?.year).toBe(-500);
    expect(snapshotAt(snapshots, 116)?.year).toBe(-264);
  });

  it("uses a snapshot on its exact year", () => {
    expect(snapshotAt(snapshots, -264)?.year).toBe(-264);
    expect(snapshotAt(snapshots, 117)?.year).toBe(117);
  });

  it("keeps the last snapshot after it", () => {
    expect(snapshotAt(snapshots, 1400)?.year).toBe(117);
  });

  it("draws no borders before the first snapshot", () => {
    expect(snapshotAt(snapshots, -501)).toBeNull();
  });
});

// A 1° square near Rome with its exterior ring counter-clockwise (RFC 7946).
const ccw: [number, number][] = [[12, 41], [13, 41], [13, 42], [12, 42], [12, 41]];
const cw = [...ccw].reverse();
const square = geoArea({ type: "Polygon", coordinates: [cw] });

describe("forD3", () => {
  it("flips RFC 7946 rings, which d3 would read as the whole globe minus the shape", () => {
    expect(geoArea({ type: "Polygon", coordinates: [ccw] })).toBeGreaterThan(2 * Math.PI);
    expect(geoArea(forD3({ type: "Polygon", coordinates: [ccw] })) / square).toBeCloseTo(1, 6);
  });

  it("leaves rings already in d3 order alone", () => {
    const g: Geometry = { type: "Polygon", coordinates: [cw] };
    expect(forD3(g)).toEqual(g);
  });

  it("keeps holes as holes", () => {
    const hole: [number, number][] = [[12.25, 41.25], [12.25, 41.75], [12.75, 41.75], [12.75, 41.25], [12.25, 41.25]];
    const area = geoArea(forD3({ type: "Polygon", coordinates: [ccw, hole] }));
    expect(area).toBeLessThan(square);
    expect(area).toBeGreaterThan(square / 2);
  });

  it("fixes each member of a MultiPolygon on its own", () => {
    const shifted = cw.map(([lon, lat]): [number, number] => [lon + 5, lat]);
    const area = geoArea(forD3({ type: "MultiPolygon", coordinates: [[ccw], [shifted]] }));
    expect(area).toBeLessThan(3 * square);
  });
});

describe("fixture", () => {
  it("follows the borders schema the real data uses", () => {
    expect(Borders.safeParse(fixture).success).toBe(true);
  });
});

describe("boundsCentre", () => {
  it("averages bounds that sit on one side of the antimeridian", () => {
    // Roman Empire, roughly.
    expect(boundsCentre([[-10, 25], [45, 55]])).toEqual([17.5, 40]);
  });

  it("centres bounds that cross the antimeridian on their true middle", () => {
    // geoBounds of World War II's pins, Normandy east to Pearl Harbor: west > east.
    const [lon, lat] = boundsCentre([[-3.6, 18.362], [-154.954, 55.517]]);
    expect(lon).toBeCloseTo(100.723, 3);
    expect(lat).toBeCloseTo(36.9395, 4);
  });

  it("keeps a crossing centre inside -180 to 180", () => {
    expect(boundsCentre([[170, 0], [-150, 10]])[0]).toBeCloseTo(-170, 6);
  });
});
