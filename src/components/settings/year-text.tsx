"use client";

import { useLocale } from "next-intl";
import { formatYear, formatYearRange } from "@/lib/years";
import { useSettings } from "./use-settings";

// Every date on screen goes through these two components so the era style,
// years-ago toggle and first-BCE explainer behave the same everywhere.

/** Stub: ui-core adds the years-ago toggle and the first-BCE explainer. */
export function YearText({ year }: { year: number }) {
  const locale = useLocale();
  const { eraStyle } = useSettings();
  return <time>{formatYear(year, locale, eraStyle)}</time>;
}

/** Stub: ui-core adds the years-ago toggle and the first-BCE explainer. */
export function YearRangeText({ start, end }: { start: number; end: number }) {
  const locale = useLocale();
  const { eraStyle } = useSettings();
  return <span>{formatYearRange(start, end, locale, eraStyle)}</span>;
}
