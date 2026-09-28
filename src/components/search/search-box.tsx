"use client";

import { useId, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { localize } from "@/lib/data/localize";
import { search, type SearchEntry } from "./search-index";
import { YearRangeText, YearText } from "@/components/settings/year-text";

export function SearchBox({ entries }: { entries: SearchEntry[] }) {
  const t = useTranslations("home");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const [query, setQuery] = useState("");
  const listId = useId();

  const results = useMemo(() => search(query, entries), [query, entries]);
  const trimmed = query.trim();

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5" htmlFor={`${listId}-input`}>
        <span className="text-sm font-medium text-muted-foreground">{t("searchLabel")}</span>
        <input
          id={`${listId}-input`}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("searchPlaceholder")}
          role="combobox"
          aria-expanded={trimmed.length > 0}
          aria-controls={listId}
          autoComplete="off"
          className="rounded-lg border border-border bg-background px-4 py-3 text-base focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        />
      </label>

      {trimmed && (
        <div aria-live="polite">
          {results.length === 0 ? (
            <p className="px-1 text-sm text-muted-foreground">{t("noResults", { query: trimmed })}</p>
          ) : (
            <ul id={listId} aria-label={t("resultsLabel")} className="flex flex-col gap-1.5">
              {results.map((result) =>
                result.type === "year" ? (
                  <li key="year">
                    <Link
                      href={{ pathname: "/timeline", query: { year: String(result.year) } }}
                      className="flex flex-col gap-0.5 rounded-lg border border-border px-3 py-2.5 hover:bg-muted"
                    >
                      <span className="text-sm font-medium">{t("seeOnTimeline")}</span>
                      <span className="text-sm text-muted-foreground">
                        <YearText year={result.year} />
                      </span>
                    </Link>
                  </li>
                ) : (
                  <li key={result.entry.id}>
                    <Link
                      href={`/c/${result.entry.id}`}
                      className="flex flex-col gap-0.5 rounded-lg border border-border px-3 py-2.5 hover:bg-muted"
                    >
                      <span className="flex items-baseline gap-1.5">
                        <span className="font-medium">{localize(result.entry.name, locale)}</span>
                        {result.entry.nativeName && (
                          <span lang={result.entry.nativeName.lang} className="text-muted-foreground">
                            {result.entry.nativeName.text}
                          </span>
                        )}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {tCommon(`regions.${result.entry.region}`)}
                        {" · "}
                        <YearRangeText
                          start={result.entry.period.latestStart}
                          end={result.entry.period.earliestEnd}
                        />
                      </span>
                    </Link>
                  </li>
                ),
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
