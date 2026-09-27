import { describe, expect, it } from "vitest";
import {
  formatYear,
  formatYearRange,
  fromDisplayYear,
  parseYearParam,
  parseYearQuery,
  roundYearsAgo,
  toDisplayYear,
  yearsAgo,
} from "./years";

// Era labels use non-breaking spaces so "1200 BCE" never wraps mid-date.
const nb = (s: string) => s.replace(/ /g, "\u00a0");

describe("astronomical <-> display years", () => {
  it("maps 1 BCE to 0 and 2 BCE to -1", () => {
    expect(fromDisplayYear(1, "BCE")).toBe(0);
    expect(fromDisplayYear(2, "BCE")).toBe(-1);
    expect(toDisplayYear(0)).toEqual({ year: 1, era: "BCE" });
    expect(toDisplayYear(-1)).toEqual({ year: 2, era: "BCE" });
  });

  it("stores 1200 BCE as -1199", () => {
    expect(fromDisplayYear(1200, "BCE")).toBe(-1199);
    expect(toDisplayYear(-1199)).toEqual({ year: 1200, era: "BCE" });
  });

  it("has no year zero on display: 1 BCE is followed directly by 1 CE", () => {
    expect(toDisplayYear(0)).toEqual({ year: 1, era: "BCE" });
    expect(toDisplayYear(1)).toEqual({ year: 1, era: "CE" });
    expect(() => fromDisplayYear(0, "CE")).toThrow(RangeError);
    expect(() => fromDisplayYear(0, "BCE")).toThrow(RangeError);
  });

  it("orders 1600 BCE before 1200 BCE", () => {
    expect(fromDisplayYear(1600, "BCE")).toBeLessThan(fromDisplayYear(1200, "BCE"));
  });

  it("round-trips every year across the era boundary", () => {
    for (let y = -3000; y <= 2100; y++) {
      const d = toDisplayYear(y);
      expect(d.year).toBeGreaterThanOrEqual(1);
      expect(fromDisplayYear(d.year, d.era)).toBe(y);
    }
  });
});

describe("formatYear", () => {
  it("uses CE/BCE labels per locale by default", () => {
    expect(formatYear(-1199, "en")).toBe(nb("1200 BCE"));
    expect(formatYear(500, "en")).toBe(nb("500 CE"));
    expect(formatYear(-1199, "es")).toBe(nb("1200 a. e. c."));
    expect(formatYear(500, "es")).toBe(nb("500 e. c."));
    expect(formatYear(-1199, "zh")).toBe("公元前1200年");
    expect(formatYear(500, "zh")).toBe("公元500年");
  });

  it("uses BC/AD labels when asked", () => {
    expect(formatYear(-1199, "en", "ad")).toBe(nb("1200 BC"));
    expect(formatYear(500, "en", "ad")).toBe(nb("500 AD"));
    expect(formatYear(-1199, "es", "ad")).toBe(nb("1200 a. C."));
    expect(formatYear(500, "es", "ad")).toBe(nb("500 d. C."));
    expect(formatYear(-1199, "zh", "ad")).toBe("公元前1200年");
  });

  it("shows 1 BCE for year 0, never 0", () => {
    expect(formatYear(0, "en")).toBe(nb("1 BCE"));
  });

  it("groups digits only from five digits up", () => {
    expect(formatYear(-2999, "en")).toBe(nb("3000 BCE"));
    expect(formatYear(-9999, "en")).toBe(nb("10,000 BCE"));
  });
});

describe("formatYearRange", () => {
  it("states the era once when both ends share it", () => {
    expect(formatYearRange(-1599, -1045, "en")).toBe(nb("1600–1046 BCE"));
    expect(formatYearRange(618, 907, "en")).toBe(nb("618–907 CE"));
    expect(formatYearRange(-1599, -1045, "es")).toBe(nb("1600–1046 a. e. c."));
    expect(formatYearRange(-1599, -1045, "zh")).toBe("公元前1600—前1046年");
    expect(formatYearRange(618, 907, "zh")).toBe("公元618—907年");
  });

  it("labels both ends when the range crosses the era boundary", () => {
    expect(formatYearRange(-26, 1453, "en")).toBe(`${nb("27 BCE")} – ${nb("1453 CE")}`);
    expect(formatYearRange(-26, 1453, "zh")).toBe("公元前27年—公元1453年");
  });
});

describe("years ago", () => {
  it("puts 1200 BCE about 3,225 years before 2026", () => {
    expect(yearsAgo(-1199, 2026)).toBe(3225);
  });

  it("counts across the missing year zero correctly", () => {
    // 1 BCE to 1 CE is one year apart.
    expect(yearsAgo(0, 2026) - yearsAgo(1, 2026)).toBe(1);
  });

  it("rounds to a friendly figure", () => {
    expect(roundYearsAgo(3225)).toBe(3200);
    expect(roundYearsAgo(3250)).toBe(3300);
    expect(roundYearsAgo(456)).toBe(460);
    expect(roundYearsAgo(45)).toBe(45);
  });
});

describe("parseYearQuery", () => {
  it.each([
    ["1200 BCE", -1199],
    ["1200 BC", -1199],
    ["1200 b.c.", -1199],
    ["1200bce", -1199],
    ["c. 1200 BCE", -1199],
    ["公元前1200年", -1199],
    ["公元前1200", -1199],
    ["前1200年", -1199],
    ["约公元前1200年", -1199],
    ["1200 a. e. c.", -1199],
    ["1200 a.C.", -1199],
    ["1200 a. C.", -1199],
    ["hacia 1200 a. C.", -1199],
    ["3,000 BCE", -2999],
    ["3.000 a. C.", -2999],
    ["-1200", -1199],
    ["500 CE", 500],
    ["500 AD", 500],
    ["AD 500", 500],
    ["500 e. c.", 500],
    ["500 d. C.", 500],
    ["公元500年", 500],
    ["500年", 500],
    ["1200", 1200],
    ["１２００", 1200],
    ["1 BCE", 0],
  ])("reads %j as %i", (input, expected) => {
    expect(parseYearQuery(input)).toBe(expected);
  });

  it.each(["", "Shang", "商", "0", "0 BCE", "12.5", "1200 BCE CE", "BCE"])(
    "rejects %j",
    (input) => {
      expect(parseYearQuery(input)).toBeNull();
    },
  );
});

describe("parseYearParam", () => {
  it("reads ?year= as an astronomical integer, unlike typed input", () => {
    expect(parseYearParam("-1199")).toBe(-1199);
    expect(parseYearParam("0")).toBe(0);
    expect(parseYearParam("1200")).toBe(1200);
  });

  it.each([null, "", "abc", "1.5", "1200 BCE"])("rejects %j", (input) => {
    expect(parseYearParam(input)).toBeNull();
  });
});
