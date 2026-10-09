import { describe, expect, it } from "vitest";
import { Borders, type Place } from "@/lib/data/schema";
import raw from "./__fixtures__/borders.json";
import { boxContains, frameBounds, MAP_HEIGHT, MAP_WIDTH, mapExtent, mapProjection, metresPerPixel, PIN_MARGIN } from "./geo";

const fixture = Borders.parse(raw);
const name = { en: "x" };
const pin = (lon: number, lat: number): Place => ({ name, lon, lat });
const bosporus = pin(28.98, 41.01);

describe("mapExtent and mapProjection", () => {
  it("keeps every pin, with its margin, inside the frame", () => {
    const pins = [pin(-61.5, -51.5), pin(-36.5, -54.3)];
    const projection = mapProjection(mapExtent(null, pins));
    for (const p of pins) {
      for (const [lon, lat] of [
        [p.lon - PIN_MARGIN, p.lat - PIN_MARGIN],
        [p.lon + PIN_MARGIN, p.lat + PIN_MARGIN],
      ]) {
        const [x, y] = projection([lon, lat])!;
        expect(x).toBeGreaterThanOrEqual(16);
        expect(x).toBeLessThanOrEqual(MAP_WIDTH - 16);
        expect(y).toBeGreaterThanOrEqual(16);
        expect(y).toBeLessThanOrEqual(MAP_HEIGHT - 16);
      }
    }
  });

  it("fits every self polity of every snapshot, not only the one drawn", () => {
    const projection = mapProjection(mapExtent(fixture, []));
    for (const s of fixture.snapshots) {
      for (const p of s.polities) {
        if (p.role !== "self") continue;
        const rings = p.geometry.type === "Polygon" ? p.geometry.coordinates : p.geometry.coordinates.flat();
        for (const [lon, lat] of rings.flat() as [number, number][]) {
          const [x, y] = projection([lon, lat])!;
          expect(x).toBeGreaterThanOrEqual(15.9);
          expect(x).toBeLessThanOrEqual(MAP_WIDTH - 15.9);
          expect(y).toBeGreaterThanOrEqual(15.9);
          expect(y).toBeLessThanOrEqual(MAP_HEIGHT - 15.9);
        }
      }
    }
  });
});

describe("frameBounds", () => {
  it("boxes a tight frame a little beyond its pins' margins", () => {
    const bounds = frameBounds(mapProjection(mapExtent(null, [bosporus])));
    expect(bounds).not.toBeNull();
    expect(boxContains(bounds!, [bosporus.lon - PIN_MARGIN, bosporus.lat - PIN_MARGIN, bosporus.lon + PIN_MARGIN, bosporus.lat + PIN_MARGIN])).toBe(true);
    // The frame is wider than tall, so it shows more longitude than the margin asks for, and little more latitude.
    expect(bounds![2] - bounds![0]).toBeGreaterThan(2 * PIN_MARGIN);
    expect(bounds![2] - bounds![0]).toBeLessThan(20);
    expect(bounds![3] - bounds![1]).toBeLessThan(10);
  });

  it("gives no box for a frame that reaches off the globe", () => {
    // Normandy to Pearl Harbor: the frame shows most of the planet.
    expect(frameBounds(mapProjection(mapExtent(null, [pin(-0.9, 49.3), pin(-157.9, 21.4)])))).toBeNull();
  });

  it("gives no box for a frame across the antimeridian", () => {
    expect(frameBounds(mapProjection(mapExtent(null, [pin(178, 0), pin(-178, 2)])))).toBeNull();
  });
});

describe("metresPerPixel", () => {
  it("is finer for a tighter frame", () => {
    const tight = metresPerPixel(mapProjection(mapExtent(null, [bosporus])));
    const wide = metresPerPixel(mapProjection(mapExtent(fixture, [])));
    expect(tight).toBeLessThan(wide);
    // A 6° margin either side of one pin across 368 px is a few km per px.
    expect(tight).toBeGreaterThan(1000);
    expect(tight).toBeLessThan(5000);
  });
});
