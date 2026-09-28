"use client";

import { useId, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { YearRangeText } from "@/components/settings/year-text";
import { search, type SearchEntry } from "@/components/search/search-index";
import { Link } from "@/i18n/navigation";
import { localize } from "@/lib/data/localize";
import { overlapOf } from "./compare-math";
import { compareHref } from "./compare-href";

const MAX_SUGGESTIONS = 8;

/**
 * Search the same index as the home page; each result is a link to the
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
  const [query, setQuery] = useState("");
  const inputId = useId();
  const trimmed = query.trim();
  const anchor = selected[0];

  const results = useMemo(() => {
    const open = (e: SearchEntry) => !selected.some((s) => s.id === e.id);
    if (trimmed) {
      return search(trimmed, entries, 12)
        .flatMap((r) => (r.type === "culture" && open(r.entry) ? [r.entry] : []))
        .slice(0, MAX_SUGGESTIONS);
    }
    if (!anchor) return [];
    const years = (e: SearchEntry) => {
      const o = overlapOf([anchor.period, e.period]);
      return o.kind === "overlap" ? o.years : o.kind === "gap" ? -1 : 0;
    };
    return entries
      .filter((e) => open(e) && years(e) >= 0)
      .sort((a, b) => years(b) - years(a) || a.id.localeCompare(b.id))
      .slice(0, MAX_SUGGESTIONS);
  }, [trimmed, entries, selected, anchor]);

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
                  <YearRangeText start={entry.period.latestStart} end={entry.period.earliestEnd} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
