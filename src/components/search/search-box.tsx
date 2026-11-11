"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
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
import { CountryFlag, NameWithFlags } from "@/components/identity/heartland-flags";
import { RegionDot } from "@/components/identity/region-dot";
import { WarDates } from "@/components/wars/war-parts";
import { SEARCH_INPUT_ID } from "./search-id";
import { CARD_LINK, CARD_TITLE, EmptyState, FIELD_LABEL, INPUT, Pill } from "@/components/ui/page";
import { cn } from "@/lib/utils";

const MAX_RESULTS = 10;

const hitKey = (hit: SearchHit) => (hit.type === "year" ? "year" : hit.type === "country" ? `country-${hit.entry.code}` : `${hit.type}-${hit.entry.id}`);

/** One result: what it is on the first line beside its kind, details under it. */
function ResultLink({ href, kind, children, details }: { href: Parameters<typeof Link>[0]["href"]; kind: string; children: ReactNode; details?: ReactNode }) {
  return (
    <Link prefetch={false} href={href} className={cn(CARD_LINK, "grid grid-cols-[1fr_auto] items-start gap-x-2 gap-y-1")}>
      <span className="flex min-w-0 flex-wrap items-baseline gap-x-1.5">{children}</span>
      <Pill tone="outline">{kind}</Pill>
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
  const selection = useRegionFilter(regions);

  const index = useMemo(() => searchIndex({ locale, countries, cultures: entries, wars, allCountryPages: true }), [locale, countries, entries, wars]);
  const hits = useMemo(() => search(query, index), [query, index]);
  // Countries, wars and years have no region, so the region chips filter only civilisations.
  const inRegions = (hit: SearchHit) => hit.type !== "culture" || includesRegion(selection, hit.entry.region);
  const results = hits.filter(inRegions).slice(0, MAX_RESULTS);
  const hiddenMatches = hits.some((hit) => !inRegions(hit));
  const trimmed = query.trim();
  // "Search instead" on a failed scan links here as /#site-search from any page.
  useEffect(() => {
    if (window.location.hash === `#${SEARCH_INPUT_ID}`) document.getElementById(SEARCH_INPUT_ID)?.focus();
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5" htmlFor={SEARCH_INPUT_ID}>
        <span className={FIELD_LABEL}>{t("searchLabel")}</span>
        <input
          id={SEARCH_INPUT_ID}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("searchPlaceholder")}
          autoComplete="off"
          enterKeyHint="search"
          className={INPUT}
        />
      </label>

      {/* Above the results, as on the wars page: one row on a phone, so the first results still clear the keyboard. */}
      <StoredRegionChips available={regions} />

      {trimmed && (
        <div aria-live="polite" className="flex flex-col gap-2">
          {results.length === 0 ? (
            // With matches hidden by the region chips, the box under this one says so instead.
            !hiddenMatches && <EmptyState title={t("noResults", { query: trimmed })}>{t("noResultsHint")}</EmptyState>
          ) : (
            <ul aria-label={t("resultsLabel")} className="flex flex-col gap-2">
              {results.map((hit) => (
                <li key={hitKey(hit)}>
                  {hit.type === "year" ? (
                    <ResultLink
                      href={{ pathname: "/timeline", query: { year: String(hit.year) } }}
                      kind={t("kind", { kind: "year" })}
                      details={<YearText year={hit.year} plain />}
                    >
                      <span className={CARD_TITLE}>{t("seeOnTimeline")}</span>
                    </ResultLink>
                  ) : hit.type === "country" ? (
                    <ResultLink href={`/country/${hit.entry.code.toLowerCase()}`} kind={t("kind", { kind: "country" })}>
                      <span className={cn(CARD_TITLE, "inline-flex items-center gap-1.5")}>
                        <CountryFlag code={hit.entry.code} />
                        {hit.entry.name}
                      </span>
                    </ResultLink>
                  ) : hit.type === "culture" ? (
                    <ResultLink
                      href={`/c/${hit.entry.id}`}
                      kind={t("kind", { kind: "culture" })}
                      details={
                        <>
                          <RegionDot region={hit.entry.region} /> {tCommon(`regions.${hit.entry.region}`)}
                          {" · "}
                          <YearRangeText start={hit.entry.period.latestStart} end={hit.entry.period.earliestEnd} plain />
                        </>
                      }
                    >
                      <span className={CARD_TITLE}>
                        <NameWithFlags name={localize(hit.entry.name, locale)} cultureId={hit.entry.id} />
                      </span>
                      {hit.entry.nativeName && (
                        <span lang={hit.entry.nativeName.lang} className="text-muted-foreground">
                          {hit.entry.nativeName.text}
                        </span>
                      )}
                    </ResultLink>
                  ) : (
                    <ResultLink href={`/war/${hit.entry.id}`} kind={t("kind", { kind: "war" })} details={<WarDates span={hit.entry.span} plain />}>
                      <span className={CARD_TITLE}>{hit.entry.name}</span>
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
