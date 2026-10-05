"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ReadonlyURLSearchParams } from "next/navigation";
import { followsParam, takeEcho, timelineQuery, yearFromParam } from "./timeline-math";

/**
 * What TimelineChart needs to read the query string for useYearParam. Only
 * useYearParam makes one (the class isn't exported, and its private field
 * stops a look-alike), and TimelineChart requires one, so a chart can't keep
 * ?year= without reading it.
 */
class YearQuery {
  readonly #read: (params: ReadonlyURLSearchParams) => void;
  constructor(read: (params: ReadonlyURLSearchParams) => void) {
    this.#read = read;
  }
  /** Bound, so it can go straight to QueryReader. */
  readonly read = (params: ReadonlyURLSearchParams) => this.#read(params);
}
export type { YearQuery };

/**
 * The year line's year, kept in ?year= (astronomical, e.g. -1199 = 1200 BCE)
 * so a shared link keeps the view; `regions` is written beside it (null drops
 * ?regions=). The returned YearQuery goes to TimelineChart, whose reader
 * reports the query string after hydration and whenever a navigation changes
 * it; `onQuery` sees each report first (the world timeline's ?regions=), and
 * `onFollow` runs when ?year= moves the line. The page is prerendered, so no
 * server keeps it in sync.
 */
export function useYearParam(
  domain: [number, number],
  fallback: number,
  regions: string | null,
  { onFollow, onQuery }: { onFollow?: () => void; onQuery?: (params: ReadonlyURLSearchParams) => void } = {},
): [number, (year: number) => void, YearQuery] {
  // undefined until the reader has reported: the URL isn't read yet, so nothing may be written over it.
  const [yearParam, setYearParam] = useState<string | null | undefined>(undefined);
  // Null until a move or ?year= sets it. The page is prerendered without
  // ?year=, so the first render shows the fallback too, or hydration fails.
  const [picked, setPicked] = useState<number | null>(null);
  const year = picked ?? yearFromParam(null, fallback, domain);
  // Refs, not state, so noting a write or a move costs a drag no extra render.
  const unechoedRef = useRef<string[]>([]);
  const movedRef = useRef(false);
  const readRef = useRef(false);

  const setYear = useCallback((next: number) => {
    movedRef.current = true;
    setPicked(next);
  }, []);

  const query = useMemo(
    () =>
      new YearQuery((params) => {
        onQuery?.(params);
        setYearParam(params.get("year"));
      }),
    [onQuery],
  );

  // Navigating here again with a new ?year= (a scan from the header) doesn't
  // remount this, so follow the param when it changes. Our own replaceState
  // below comes back through here too, and takeEcho tells it apart. A layout
  // effect, so the line moves in the same paint as whatever onQuery changed.
  useLayoutEffect(() => {
    if (yearParam === undefined) return;
    const firstRead = !readRef.current;
    readRef.current = true;
    const taken = takeEcho(unechoedRef.current, yearParam);
    unechoedRef.current = taken.unechoed;
    if (!followsParam(yearParam, taken.echo, firstRead, movedRef.current)) return;
    setPicked((y) => yearFromParam(yearParam, y ?? fallback, domain));
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

  return [year, setYear, query];
}
