"use client";

import { useId, useMemo, useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { localize } from "@/lib/data/localize";
import type { Region } from "@/lib/data/schema";
import {
  search,
  searchIndex,
  type CountrySearchEntry,
  type SearchEntry,
  type SearchHit,
  type WarSearchEntry,
} from "./search-index";
import { YearRangeText, YearText } from "@/components/settings/year-text";
import { NoneInRegions, StoredRegionChips } from "@/components/filters/region-chips";
import { includesRegion } from "@/components/filters/region-filter";
import { useRegionFilter } from "@/components/filters/use-region-filter";
import { CountryFlag, HeartlandFlags } from "@/components/identity/heartland-flags";
import { RegionDot } from "@/components/identity/region-dot";
import { WarDates } from "@/components/wars/war-parts";

const MAX_RESULTS = 10;

const hitKey = (hit: SearchHit) => (hit.type === "year" ? "year" : hit.type === "country" ? `country-${hit.entry.code}` : `${hit.type}-${hit.entry.id}`);

/** One result: what it is on the first line beside its kind, details under it. */
function ResultLink({ href, kind, children, details }: { href: Parameters<typeof Link>[0]["href"]; kind: string; children: ReactNode; details?: ReactNode }) {
  return (
    <Link href={href} className="grid grid-cols-[1fr_auto] items-start gap-x-2 gap-y-0.5 rounded-lg border border-border px-3 py-2.5 hover:bg-muted">
      <span className="flex min-w-0 flex-wrap items-center gap-x-1.5">{children}</span>
      <span className="mt-0.5 rounded-full border border-border px-1.5 text-xs text-muted-foreground">{kind}</span>
      {details && <span className="col-span-2 text-sm text-muted-foreground">{details}</span>}
    </Link>
  );
}

export function SearchBox({
  countries,
  entries,
  wars,
  regions,
  initialQuery = "",
}: {
  countries: CountrySearchEntry[];
  entries: SearchEntry[];
  wars: WarSearchEntry[];
  regions: Region[];
  initialQuery?: string;
}) {
  const t = useTranslations("home");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const [query, setQuery] = useState(initialQuery);
  const listId = useId();
  const selection = useRegionFilter(regions);

  const index = useMemo(() => searchIndex({ locale, countries, cultures: entries, wars }), [locale, countries, entries, wars]);
  const hits = useMemo(() => search(query, index), [query, index]);
  // Countries, wars and years have no region, so the region chips filter only civilisations.
  const inRegions = (hit: SearchHit) => hit.type !== "culture" || includesRegion(selection, hit.entry.region);
  const results = hits.filter(inRegions).slice(0, MAX_RESULTS);
  const hiddenMatches = hits.some((hit) => !inRegions(hit));
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
          {results.length === 0 ? (
            <div className="flex flex-col gap-1 px-1 text-sm text-muted-foreground">
              <p>{t("noResults", { query: trimmed })}</p>
              <p>{t("noResultsHint")}</p>
            </div>
          ) : (
            <ul id={listId} aria-label={t("resultsLabel")} className="flex flex-col gap-1.5">
              {results.map((hit) => (
                <li key={hitKey(hit)}>
                  {hit.type === "year" ? (
                    <ResultLink
                      href={{ pathname: "/timeline", query: { year: String(hit.year) } }}
                      kind={t("kind", { kind: "year" })}
                      details={<YearText year={hit.year} />}
                    >
                      <span className="font-medium">{t("seeOnTimeline")}</span>
                    </ResultLink>
                  ) : hit.type === "country" ? (
                    <ResultLink href={`/country/${hit.entry.code.toLowerCase()}`} kind={t("kind", { kind: "country" })}>
                      <CountryFlag code={hit.entry.code} />
                      <span className="font-medium">{hit.entry.name}</span>
                    </ResultLink>
                  ) : hit.type === "culture" ? (
                    <ResultLink
                      href={`/c/${hit.entry.id}`}
                      kind={t("kind", { kind: "culture" })}
                      details={
                        <>
                          <RegionDot region={hit.entry.region} /> {tCommon(`regions.${hit.entry.region}`)}
                          {" · "}
                          <YearRangeText start={hit.entry.period.latestStart} end={hit.entry.period.earliestEnd} />
                        </>
                      }
                    >
                      <span className="font-medium">{localize(hit.entry.name, locale)}</span>
                      {hit.entry.nativeName && (
                        <span lang={hit.entry.nativeName.lang} className="text-muted-foreground">
                          {hit.entry.nativeName.text}
                        </span>
                      )}
                      <HeartlandFlags cultureId={hit.entry.id} />
                    </ResultLink>
                  ) : (
                    <ResultLink href={`/war/${hit.entry.id}`} kind={t("kind", { kind: "war" })} details={<WarDates span={hit.entry.span} />}>
                      <span className="font-medium">{hit.entry.name}</span>
                    </ResultLink>
                  )}
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
