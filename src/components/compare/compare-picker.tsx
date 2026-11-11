"use client";

import { useId, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSettings } from "@/components/settings/use-settings";
import { search, searchIndex, type SearchEntry } from "@/components/search/search-index";
import { Link } from "@/i18n/navigation";
import { localize } from "@/lib/data/localize";
import { formatYearRange } from "@/lib/years";
import { CARD_LINK, CARD_TITLE, EmptyState, FIELD_LABEL, INPUT, SectionHeading } from "@/components/ui/page";
import { cn } from "@/lib/utils";
import { compareHref } from "./compare-href";

const MAX_SUGGESTIONS = 8;

/**
 * Search civilisations the way the home page does; each result is a link to the
 * compare URL with that culture added. With nothing typed, suggests cultures
 * alive at the same time as the first one picked.
 */
export function ComparePicker({
  entries,
  selected,
  label,
  starters,
}: {
  entries: SearchEntry[];
  selected: SearchEntry[];
  label: string;
  /** Shown before anything is picked or typed, so the page is never just an empty box. */
  starters: SearchEntry[];
}) {
  const t = useTranslations("compare");
  const tCommon = useTranslations("common");
  const tHome = useTranslations("home");
  const locale = useLocale();
  const { eraStyle } = useSettings();
  const [query, setQuery] = useState("");
  const inputId = useId();
  const trimmed = query.trim();
  const anchor = selected[0];
  const index = useMemo(() => searchIndex({ locale, cultures: entries }), [locale, entries]);

  const results = useMemo(() => {
    const open = (e: SearchEntry) => !selected.some((s) => s.id === e.id);
    if (trimmed) {
      return search(trimmed, index)
        .flatMap((r) => (r.type === "culture" && open(r.entry) ? [r.entry] : []))
        .slice(0, MAX_SUGGESTIONS);
    }
    if (!anchor) return starters;
    const years = (e: SearchEntry) =>
      Math.min(anchor.period.earliestEnd, e.period.earliestEnd) -
      Math.max(anchor.period.latestStart, e.period.latestStart) +
      1;
    return entries
      .filter((e) => open(e) && years(e) > 0)
      .sort((a, b) => years(b) - years(a) || a.id.localeCompare(b.id))
      .slice(0, MAX_SUGGESTIONS);
  }, [trimmed, entries, index, selected, anchor, starters]);

  return (
    <div className="flex flex-col gap-4">
      <label htmlFor={inputId} className="flex flex-col gap-1.5">
        <span className={FIELD_LABEL}>{label}</span>
        <input
          id={inputId}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("searchPlaceholder")}
          autoComplete="off"
          className={INPUT}
        />
      </label>

      <div aria-live="polite" className="flex flex-col gap-3">
      {trimmed && results.length === 0 && (
        <EmptyState title={t("noResults", { query: trimmed })}>{tHome("noResultsHint")}</EmptyState>
      )}
      {!trimmed && results.length > 0 && (
        <SectionHeading size="sub">{anchor ? t("sameTime") : t("suggestions")}</SectionHeading>
      )}
      {results.length > 0 && (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {results.map((entry) => (
            <li key={entry.id}>
              <Link
                prefetch={false}
                href={compareHref([...selected.map((e) => e.id), entry.id])}
                className={cn(CARD_LINK, "flex h-full flex-col gap-1")}
              >
                <span className="flex flex-wrap items-baseline gap-x-1.5">
                  <span className={CARD_TITLE}>{localize(entry.name, locale)}</span>
                  {entry.nativeName && (
                    <span lang={entry.nativeName.lang} className="text-muted-foreground">
                      {entry.nativeName.text}
                    </span>
                  )}
                </span>
                <span className="text-sm text-muted-foreground">
                  {tCommon(`regions.${entry.region}`)}
                  {" · "}
                  {/* Plain text, not the tappable date: a thumb on the row must pick the culture. */}
                  {formatYearRange(entry.period.latestStart, entry.period.earliestEnd, locale, eraStyle)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      </div>
    </div>
  );
}
