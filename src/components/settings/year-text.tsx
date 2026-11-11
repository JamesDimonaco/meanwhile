"use client";

import { useEffect, type MouseEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { claimFirstBCEAutoOpen, useExplainer } from "@/components/explainer/explainer-provider";
import { currentYear, formatYear, formatYearRange, roundYearsAgo, toDisplayYear, yearsAgo } from "@/lib/years";
import { TOUCH_AREA } from "@/components/ui/page";
import { cn } from "@/lib/utils";
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

function openFromDate(e: MouseEvent<HTMLButtonElement>, open: (year: number) => void, year: number) {
  e.preventDefault();
  e.stopPropagation();
  open(year);
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

const DATE_BUTTON = cn(
  TOUCH_AREA,
  "inline-flex min-h-6 items-center whitespace-nowrap rounded underline decoration-dotted decoration-from-font underline-offset-2 hover:decoration-solid focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
);

/**
 * A year, as text. Pass `explain` where it stands alone (a page header, the timeline's year readout) to make it
 * a button that opens the CE/BCE explainer for this date. Text is the default because most dates sit inside a
 * link, a <summary> or another button, where a button is invalid HTML and takes the tap meant for the card: a
 * forgotten prop must not be able to do that. The explainer is one tap away in the header on every page.
 */
export function YearText({ year, explain = false }: { year: number; explain?: boolean }) {
  const locale = useLocale();
  const { eraStyle, showYearsAgo } = useSettings();
  const { open } = useExplainer();
  useFirstBCEAutoOpen(year);

  return (
    // The date itself must not break mid-string, but "· about N years ago" can wrap
    // onto its own line rather than force the whole thing past a narrow card's edge.
    <span className="inline-flex flex-wrap items-baseline gap-x-1">
      <time className="whitespace-nowrap">
        {explain ? (
          <button type="button" onClick={(e) => openFromDate(e, open, year)} className={DATE_BUTTON}>
            {formatYear(year, locale, eraStyle)}
          </button>
        ) : (
          formatYear(year, locale, eraStyle)
        )}
      </time>
      {showYearsAgo && <YearsAgo year={year} />}
    </span>
  );
}

/** A year range: as a button it opens the explainer for the range's start year. `explain` as on YearText. */
export function YearRangeText({ start, end, explain = false }: { start: number; end: number; explain?: boolean }) {
  const locale = useLocale();
  const { eraStyle, showYearsAgo } = useSettings();
  const { open } = useExplainer();
  useFirstBCEAutoOpen(start);

  return (
    // Same wrap point as YearText: keep the range itself intact, let years-ago fall to its own line.
    <span className="inline-flex flex-wrap items-baseline gap-x-1">
      {explain ? (
        <button type="button" onClick={(e) => openFromDate(e, open, start)} className={DATE_BUTTON}>
          {formatYearRange(start, end, locale, eraStyle)}
        </button>
      ) : (
        <span className="whitespace-nowrap">{formatYearRange(start, end, locale, eraStyle)}</span>
      )}
      {showYearsAgo && <YearsAgo year={start} />}
    </span>
  );
}
