"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { takeEcho, timelineQuery, yearFromParam } from "./timeline-math";

/**
 * The year line's year, kept in ?year= (astronomical, e.g. -1199 = 1200 BCE)
 * so a shared link keeps the view; `regions` is written beside it (null drops
 * ?regions=). ?year= is read on mount and whenever a navigation changes it,
 * when `onFollow` runs; otherwise this owns it. The page is prerendered, so
 * no server keeps it in sync.
 */
export function useYearParam(
  domain: [number, number],
  fallback: number,
  regions: string | null,
  onFollow?: () => void,
): [number, (year: number) => void] {
  const yearParam = useSearchParams().get("year");
  const [year, setYear] = useState(() => yearFromParam(yearParam, fallback, domain));
  // A ref, not state, so noting a write costs a drag no extra render.
  const unechoedRef = useRef<string[]>([]);

  // Navigating here again with a new ?year= (a scan from the header) doesn't
  // remount this, so follow the param when it changes. Our own replaceState
  // below comes back through here too, and takeEcho tells it apart.
  useEffect(() => {
    const taken = takeEcho(unechoedRef.current, yearParam);
    unechoedRef.current = taken.unechoed;
    if (taken.echo || yearParam === null) return;
    setYear((y) => yearFromParam(yearParam, y, domain));
    onFollow?.();
  }, [yearParam, domain, onFollow]);

  // Keep the URL shareable. Not required for the page to work, so a failure
  // (e.g. History API unavailable) is silently ignored.
  useEffect(() => {
    try {
      const { query, yearChanged } = timelineQuery(window.location.search, year, regions);
      window.history.replaceState(null, "", `${window.location.pathname}?${query}`);
      if (yearChanged) unechoedRef.current = [...unechoedRef.current, String(year)];
    } catch {
      // Ignore.
    }
  }, [year, regions]);

  return [year, setYear];
}
