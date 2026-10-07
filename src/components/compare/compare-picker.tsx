"use client";

import { useId, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSettings } from "@/components/settings/use-settings";
import { search, searchIndex, type SearchEntry } from "@/components/search/search-index";
import { Link } from "@/i18n/navigation";
import { localize } from "@/lib/data/localize";
import { formatYearRange } from "@/lib/years";
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
}: {
  entries: SearchEntry[];
  selected: SearchEntry[];
  label: string;
}) {
  const t = useTranslations("compare");
  const tCommon = useTranslations("common");
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
    if (!anchor) return [];
    const years = (e: SearchEntry) =>
      Math.min(anchor.period.earliestEnd, e.period.earliestEnd) -
      Math.max(anchor.period.latestStart, e.period.latestStart) +
      1;
    return entries
      .filter((e) => open(e) && years(e) > 0)
      .sort((a, b) => years(b) - years(a) || a.id.localeCompare(b.id))
      .slice(0, MAX_SUGGESTIONS);
  }, [trimmed, entries, index, selected, anchor]);

  return (
    <div className="flex flex-col gap-3">
      <label htmlFor={inputId} className="flex flex-col gap-1.5">
        <span className="font-medium">{label}</span>
        <input
          id={inputId}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("searchPlaceholder")}
          autoComplete="off"
          className="rounded-lg border border-border bg-background px-4 py-3 text-base focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        />
      </label>

      {trimmed && results.length === 0 && (
        <p className="px-1 text-sm text-muted-foreground">{t("noResults", { query: trimmed })}</p>
      )}
      {!trimmed && results.length > 0 && (
        <h2 className="text-sm font-medium text-muted-foreground">{t("sameTime")}</h2>
      )}
      {results.length > 0 && (
        <ul aria-live="polite" className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {results.map((entry) => (
            <li key={entry.id}>
              <Link
                prefetch={false}
                href={compareHref([...selected.map((e) => e.id), entry.id])}
                className="flex flex-col gap-0.5 rounded-lg border border-border px-3 py-2.5 hover:bg-muted"
              >
                <span className="flex items-baseline gap-1.5">
                  <span className="font-medium">{localize(entry.name, locale)}</span>
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
  );
}
