"use client";

import { useId, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { localize } from "@/lib/data/localize";
import type { Region } from "@/lib/data/schema";
import { search, searchWars, type SearchEntry, type WarSearchEntry } from "./search-index";
import { YearRangeText, YearText } from "@/components/settings/year-text";
import { NoneInRegions, StoredRegionChips } from "@/components/filters/region-chips";
import { includesRegion } from "@/components/filters/region-filter";
import { useRegionFilter } from "@/components/filters/use-region-filter";
import { HeartlandFlags } from "@/components/identity/heartland-flags";
import { RegionDot } from "@/components/identity/region-dot";
import { WarDates } from "@/components/wars/war-parts";

export function SearchBox({
  entries,
  wars,
  regions,
  initialQuery = "",
}: {
  entries: SearchEntry[];
  wars: WarSearchEntry[];
  regions: Region[];
  initialQuery?: string;
}) {
  const t = useTranslations("home");
  const tCommon = useTranslations("common");
  const tWars = useTranslations("wars");
  const locale = useLocale();
  const [query, setQuery] = useState(initialQuery);
  const listId = useId();
  const selection = useRegionFilter(regions);

  const results = useMemo(
    () => search(query, entries.filter((e) => includesRegion(selection, e.region))),
    [query, entries, selection],
  );
  const hiddenMatches = useMemo(
    () => search(query, entries.filter((e) => !includesRegion(selection, e.region))).some((r) => r.type === "culture"),
    [query, entries, selection],
  );
  // Wars have no region, so the region chips don't filter them.
  const warResults = useMemo(() => searchWars(query, wars), [query, wars]);
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

      <StoredRegionChips available={regions} />

      {trimmed && (
        <div aria-live="polite" className="flex flex-col gap-2">
          {results.length === 0 && warResults.length === 0 ? (
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
                      <span className="flex flex-wrap items-center gap-x-1.5">
                        <span className="font-medium">{localize(result.entry.name, locale)}</span>
                        {result.entry.nativeName && (
                          <span lang={result.entry.nativeName.lang} className="text-muted-foreground">
                            {result.entry.nativeName.text}
                          </span>
                        )}
                        <HeartlandFlags cultureId={result.entry.id} />
                      </span>
                      <span className="text-sm text-muted-foreground">
                        <RegionDot region={result.entry.region} />{" "}
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
              {warResults.map((war) => (
                <li key={`war-${war.id}`}>
                  <Link
                    href={`/war/${war.id}`}
                    className="flex flex-col gap-0.5 rounded-lg border border-border px-3 py-2.5 hover:bg-muted"
                  >
                    <span className="font-medium">{war.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {tWars("war")}
                      {" · "}
                      <WarDates span={war.span} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {hiddenMatches && <NoneInRegions message="hiddenByFilter" />}
        </div>
      )}
    </div>
  );
}
