import { describe, expect, it } from "vitest";
import { landFrame, type LandMap } from "@/lib/map/land";
import { validateLand, WHOLE_GLOBE } from "./validate-land";

const name = { en: "x" };
const ring = [
  [0, 0],
  [1, 0],
  [1, 1],
  [0, 1],
  [0, 0],
];
const landFile = (id: string, bbox: readonly number[]) => ({
  path: `public/geo/land/${id}.json`,
  data: { type: "MultiPolygon", bbox, coordinates: [[ring]] },
});

const constantinople: LandMap = { id: "fall-of-constantinople", borders: null, pins: [{ name, lon: 28.98, lat: 41.01 }] };
const worldWar: LandMap = {
  id: "world-war-ii",
  borders: null,
  pins: [
    { name, lon: -0.9, lat: 49.3 },
    { name, lon: -157.9, lat: 21.4 },
  ],
};

describe("validateLand", () => {
  it("passes a file cut just around the map's frame", () => {
    const bounds = landFrame(constantinople).bounds!;
    const cut = [bounds[0] - 0.2, bounds[1] - 0.1, bounds[2] + 0.2, bounds[3] + 0.1];
    expect(validateLand([landFile(constantinople.id, cut)], [constantinople])).toEqual({ errors: [], warnings: [] });
  });

  it("fails a map with no land file, naming the command that makes one", () => {
    const { errors } = validateLand([], [constantinople]);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/fall-of-constantinople\.json: missing.*pnpm land/);
  });

  it("fails a file whose cut no longer holds the map's frame", () => {
    const { errors } = validateLand([landFile(constantinople.id, [28, 40, 30, 42])], [constantinople]);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/moved outside the cut/);
  });

  it("warns when the cut is far wider than the frame, so the coast is coarser than it could be", () => {
    const { errors, warnings } = validateLand([landFile(constantinople.id, [-30, 10, 70, 70])], [constantinople]);
    expect(errors).toEqual([]);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatch(/coarser/);
  });

  it("wants the whole globe for a frame that reaches off it", () => {
    expect(validateLand([landFile(worldWar.id, WHOLE_GLOBE)], [worldWar]).errors).toEqual([]);
    expect(validateLand([landFile(worldWar.id, [-170, -60, 60, 80])], [worldWar]).errors[0]).toMatch(/off the globe/);
  });

  it("fails a file that is not a cut MultiPolygon", () => {
    const file = { path: "public/geo/land/fall-of-constantinople.json", data: { type: "Polygon", coordinates: [ring] } };
    expect(validateLand([file], [constantinople]).errors[0]).toMatch(/fall-of-constantinople\.json/);
  });

  it("warns about a land file no map uses", () => {
    const { warnings } = validateLand([landFile("gone", WHOLE_GLOBE)], []);
    expect(warnings[0]).toMatch(/gone\.json: no map uses it/);
  });
});
