import { describe, expect, it } from "vitest";
import { PAIR_WINDOW, buildSpine, isPaired, overlapOf } from "./compare-math";

// Years are astronomical: -201 = 202 BCE, -999 = 1000 BCE.
const period = (earliestStart: number, latestStart: number, earliestEnd: number, latestEnd: number) => ({
  earliestStart,
  latestStart,
  earliestEnd,
  latestEnd,
});
const sharp = (start: number, end: number) => period(start, start, end, end);

describe("overlapOf", () => {
  it("counts the calendar years both were alive, inclusive: Han in Rome is 422 years (202 BCE – 220 CE)", () => {
    const han = period(-205, -201, 220, 220);
    const rome = sharp(-752, 1453);
    expect(overlapOf([rome, han])).toEqual({ kind: "overlap", start: -201, end: 220, years: 422 });
  });

  it("uses the solid part of each bar, not the fuzzy edges", () => {
    const a = period(-3199, -3099, -1099, -1059);
    const b = period(-1599, -1499, -1049, -1045);
    expect(overlapOf([a, b])).toEqual({ kind: "overlap", start: -1499, end: -1099, years: 401 });
  });

  it("calls it touching when one ends in the year the other begins", () => {
    expect(overlapOf([sharp(-205, 220), sharp(220, 280)])).toEqual({ kind: "touching", year: 220 });
  });

  it("measures a gap between the solid parts: 1000 BCE to 660 BCE is 340 years apart", () => {
    expect(overlapOf([sharp(-1999, -999), sharp(-659, 100)])).toEqual({ kind: "gap", years: 340 });
    expect(overlapOf([sharp(-659, 100), sharp(-1999, -999)])).toEqual({ kind: "gap", years: 340 });
  });

  it("is uncertain when only the fuzzy edges meet, and gives where they meet", () => {
    const a = period(-100, -50, 100, 180);
    const b = period(150, 200, 400, 400);
    expect(overlapOf([a, b])).toEqual({ kind: "uncertain", start: 150, end: 180 });
  });

  it("is a gap, not uncertain, when fuzzy edges only reach each other's fuzzy edges without meeting", () => {
    const a = period(-100, -50, 100, 140);
    const b = period(150, 200, 400, 400);
    expect(overlapOf([a, b])).toEqual({ kind: "gap", years: 100 });
  });

  it("intersects all of them when there are three", () => {
    expect(overlapOf([sharp(0, 500), sharp(100, 300), sharp(200, 900)])).toEqual({
      kind: "overlap",
      start: 200,
      end: 300,
      years: 101,
    });
  });
});

const ev = (id: string, start: number) => ({ id, start });
const ids = (rows: ReturnType<typeof buildSpine<{ id: string; start: number }>>) =>
  rows.map((r) => r.cells.map((c) => c?.id ?? "-").join("|"));

describe("buildSpine", () => {
  it("pins the pairing window at 25 years", () => {
    expect(PAIR_WINDOW).toBe(25);
  });

  it("pairs events 25 years apart across the sides, but not 26", () => {
    const at25 = buildSpine([[ev("a", 100)], [ev("b", 125)]]);
    expect(ids(at25)).toEqual(["a|b"]);
    expect(isPaired(at25[0])).toBe(true);

    const at26 = buildSpine([[ev("a", 100)], [ev("b", 126)]]);
    expect(ids(at26)).toEqual(["a|-", "-|b"]);
    expect(at26.some(isPaired)).toBe(false);
  });

  it("merges both sides into one list in year order, each row dated by its earliest event", () => {
    const rows = buildSpine([
      [ev("a3", 900), ev("a1", 100), ev("a2", 500)],
      [ev("b2", 700), ev("b1", 300)],
    ]);
    expect(ids(rows)).toEqual(["a1|-", "-|b1", "a2|-", "-|b2", "a3|-"]);
    expect(rows.map((r) => r.year)).toEqual([100, 300, 500, 700, 900]);
  });

  it("dates a pair by its earlier event", () => {
    const rows = buildSpine([[ev("a", 40)], [ev("b", 22)]]);
    expect(ids(rows)).toEqual(["a|b"]);
    expect(rows[0].year).toBe(22);
  });

  it("orders one side's same-year events by id, whatever order they arrive in", () => {
    expect(ids(buildSpine([[ev("y", 100), ev("x", 100)], []]))).toEqual(["x|-", "y|-"]);
  });

  it("prefers the closest partner: Han's founding pairs with Zama (same year), not Cannae", () => {
    const rome = [ev("cannae", -215), ev("zama", -201)];
    const han = [ev("liu-bang", -201)];
    expect(ids(buildSpine([rome, han]))).toEqual(["cannae|-", "zama|liu-bang"]);
  });

  it("pairs each event at most once, and makes as many pairs as it can", () => {
    const rows = buildSpine([
      [ev("a1", 0), ev("a2", 20)],
      [ev("b1", 10), ev("b2", 30)],
    ]);
    expect(ids(rows)).toEqual(["a1|b1", "a2|b2"]);
  });

  it("never crosses pairing lines: both sides stay in their own year order", () => {
    const rows = buildSpine([
      [ev("a1", 0), ev("a2", 5), ev("a3", 8)],
      [ev("b1", -10), ev("b2", 7), ev("b3", 30)],
    ]);
    // Nearest-first would grab a3–b2 (1 year) and strand the rest; three uncrossed pairs beat it.
    expect(ids(rows)).toEqual(["a1|b1", "a2|b2", "a3|b3"]);
    for (const side of [0, 1]) {
      const starts = rows.flatMap((r) => (r.cells[side] ? [r.cells[side].start] : []));
      expect(starts).toEqual([...starts].sort((x, y) => x - y));
    }
    expect(rows.map((r) => r.year)).toEqual([...rows.map((r) => r.year)].sort((x, y) => x - y));
  });

  it("lets a third side join a pair only when it is within the window of every event already in it", () => {
    const rows = buildSpine([[ev("a", 0)], [ev("b", 20)], [ev("c", 30)]]);
    // c is 10 from b but 30 from a: it gets its own row.
    expect(ids(rows)).toEqual(["a|b|-", "-|-|c"]);

    const joined = buildSpine([[ev("a", 0)], [ev("b", 20)], [ev("c", 10)]]);
    expect(ids(joined)).toEqual(["a|b|c"]);
  });
});
