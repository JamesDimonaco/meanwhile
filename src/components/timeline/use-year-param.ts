"use client";

import { useEffect, useRef, useState } from "react";
import { takeEcho, timelineQuery, yearFromParam } from "./timeline-math";

/**
 * The year line's year, kept in ?year= (astronomical, e.g. -1199 = 1200 BCE)
 * so a shared link keeps the view; `regions` is written beside it (null drops
 * ?regions=). The caller passes ?year= in through the returned `readYearParam`
 * (from a QueryReader) after mount and whenever a navigation changes it, when
 * `onFollow` runs; otherwise this owns it. The page is prerendered, so no
 * server keeps it in sync.
 */
export function useYearParam(
  domain: [number, number],
  fallback: number,
  regions: string | null,
  onFollow?: () => void,
): [number, (year: number) => void, (param: string | null) => void] {
  // undefined until the QueryReader has reported: the URL isn't read yet, so nothing may be written over it.
  const [yearParam, readYearParam] = useState<string | null | undefined>(undefined);
  // Null until a move or ?year= sets it. The page is prerendered without
  // ?year=, so the first render shows the fallback too, or hydration fails.
  const [picked, setYear] = useState<number | null>(null);
  const year = picked ?? yearFromParam(null, fallback, domain);
  // A ref, not state, so noting a write costs a drag no extra render.
  const unechoedRef = useRef<string[]>([]);

  // Navigating here again with a new ?year= (a scan from the header) doesn't
  // remount this, so follow the param when it changes. Our own replaceState
  // below comes back through here too, and takeEcho tells it apart.
  useEffect(() => {
    if (yearParam === undefined) return;
    const taken = takeEcho(unechoedRef.current, yearParam);
    unechoedRef.current = taken.unechoed;
    if (taken.echo || yearParam === null) return;
    setYear((y) => yearFromParam(yearParam, y ?? fallback, domain));
    onFollow?.();
  }, [yearParam, domain, fallback, onFollow]);

  // Keep the URL shareable. Not required for the page to work, so a failure
  // (e.g. History API unavailable) is silently ignored.
  useEffect(() => {
    if (yearParam === undefined) return;
    // Until the effect above takes a link's ?year=, `year` is the fallback: don't write that over it.
    if (picked === null && yearParam !== null && yearParam !== String(year)) return;
    try {
      const { query, yearChanged } = timelineQuery(window.location.search, year, regions);
      window.history.replaceState(null, "", `${window.location.pathname}?${query}`);
      if (yearChanged) unechoedRef.current = [...unechoedRef.current, String(year)];
    } catch {
      // Ignore.
    }
  }, [year, picked, yearParam, regions]);

  return [year, setYear, readYearParam];
}
