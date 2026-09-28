"use client";

import { useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { claimFirstBCEAutoOpen, useExplainer } from "@/components/explainer/explainer-provider";
import { currentYear, formatYear, formatYearRange, roundYearsAgo, toDisplayYear, yearsAgo } from "@/lib/years";
import { useSettings } from "./use-settings";

// Every date on screen goes through these two components so the era style,
// years-ago toggle and first-BCE explainer behave the same everywhere.

/** Opens the explainer the first time this browser ever sees a BCE date. */
function useFirstBCEAutoOpen(year: number) {
  const { open } = useExplainer();
  useEffect(() => {
    if (toDisplayYear(year).era === "BCE" && claimFirstBCEAutoOpen()) open(year);
  }, [year, open]);
}

function YearsAgo({ year }: { year: number }) {
  const t = useTranslations("common");
  // currentYear() reads the clock; only called once mounted (settings.showYearsAgo
  // is false on both the static render and the server snapshot, so this branch
  // never runs during the render that has to match the static HTML).
  return (
    <span className="text-muted-foreground">
      {" · "}
      {t("yearsAgo", { count: roundYearsAgo(Math.max(0, yearsAgo(year, currentYear()))) })}
    </span>
  );
}

/** A tappable year: opens the CE/BCE explainer for this date, with the years-ago toggle applied. */
export function YearText({ year }: { year: number }) {
  const locale = useLocale();
  const { eraStyle, showYearsAgo } = useSettings();
  const { open } = useExplainer();
  useFirstBCEAutoOpen(year);

  return (
    <time className="whitespace-nowrap">
      <button
        type="button"
        onClick={() => open(year)}
        className="rounded underline decoration-dotted decoration-from-font underline-offset-2 hover:decoration-solid focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        {formatYear(year, locale, eraStyle)}
      </button>
      {showYearsAgo && <YearsAgo year={year} />}
    </time>
  );
}

/** A tappable year range: opens the explainer for the range's start year. */
export function YearRangeText({ start, end }: { start: number; end: number }) {
  const locale = useLocale();
  const { eraStyle, showYearsAgo } = useSettings();
  const { open } = useExplainer();
  useFirstBCEAutoOpen(start);

  return (
    <span className="whitespace-nowrap">
      <button
        type="button"
        onClick={() => open(start)}
        className="rounded underline decoration-dotted decoration-from-font underline-offset-2 hover:decoration-solid focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        {formatYearRange(start, end, locale, eraStyle)}
      </button>
      {showYearsAgo && <YearsAgo year={start} />}
    </span>
  );
}
