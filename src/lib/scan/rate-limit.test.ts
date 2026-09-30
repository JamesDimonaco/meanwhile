import { describe, expect, it } from "vitest";
import { SCAN_RATE_LIMIT, createRateLimiter } from "./rate-limit";

describe("scan rate limit", () => {
  it("allows 30 scans per IP per 10 minutes", () => {
    expect(SCAN_RATE_LIMIT).toEqual({ max: 30, windowMs: 10 * 60 * 1000 });
  });

  it("refuses the scan after the cap, per key, until the window has passed", () => {
    const limiter = createRateLimiter({ max: 3, windowMs: 1000 });
    expect([0, 1, 2].map((t) => limiter.take("a", t))).toEqual([true, true, true]);
    expect(limiter.take("a", 999)).toBe(false);
    expect(limiter.take("b", 999)).toBe(true);
    expect(limiter.take("a", 1000)).toBe(true);
    expect(limiter.take("a", 1001)).toBe(true);
    expect(limiter.take("a", 1002)).toBe(true);
    expect(limiter.take("a", 1003)).toBe(false);
  });
});
