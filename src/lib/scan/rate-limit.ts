/**
 * Best effort only: the count lives in one function instance's memory, so it
 * resets on a cold start and isn't shared between concurrent instances.
 */
export const SCAN_RATE_LIMIT = { max: 30, windowMs: 10 * 60 * 1000 };

/** Every IP together, so a flood from many addresses can't run up the bill on one instance. */
export const SCAN_INSTANCE_LIMIT = { max: 120, windowMs: 60 * 60 * 1000 };

export function createRateLimiter({ max, windowMs }: { max: number; windowMs: number }) {
  const hits = new Map<string, number[]>();
  return {
    /** Records a hit and says whether it's within the limit. */
    take(key: string, now: number): boolean {
      // Stop a flood of distinct keys from growing the map without bound.
      if (hits.size > 10_000) {
        for (const [k, times] of hits) if (times[times.length - 1] <= now - windowMs) hits.delete(k);
      }
      const recent = (hits.get(key) ?? []).filter((t) => t > now - windowMs);
      if (recent.length >= max) {
        hits.set(key, recent);
        return false;
      }
      recent.push(now);
      hits.set(key, recent);
      return true;
    },
  };
}
