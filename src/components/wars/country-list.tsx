"use client";

import { useId, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Chip, ChipGroup } from "@/components/filters/region-chips";
import { CARD_LINK, CARD_TITLE, EmptyState, FIELD_LABEL, INPUT, keepResultsAboveKeyboard, SectionHeading } from "@/components/ui/page";
import { cn } from "@/lib/utils";
import { CountryFlag } from "@/components/identity/heartland-flags";
import { search, searchIndex, type WarSearchEntry } from "@/components/search/search-index";
import { Link } from "@/i18n/navigation";
import type { Continent } from "@/lib/data/countries";
import type { CountryEntry } from "@/lib/data/wars";
import { WarDates } from "./war-parts";

/** The wars page: countries by flag, a search box over countries and wars, continent chips. */
export function CountryList({
  countries,
  continents,
  wars,
}: {
  countries: CountryEntry[];
  continents: readonly Continent[];
  wars: WarSearchEntry[];
}) {
  const t = useTranslations("wars");
  const locale = useLocale();
  const id = useId();
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<Continent[]>([]);
  const q = query.trim();

  const index = useMemo(() => searchIndex({ locale, countries, wars, countryInside: true }), [locale, countries, wars]);
  const hits = useMemo(() => search(q, index), [q, index]);
  // With a query, countries come in the order the search ranks them; without, alphabetically.
  const shownCountries = useMemo(() => {
    const byCode = new Map(countries.map((c) => [c.code, c]));
    const listed = q ? hits.flatMap((h) => (h.type === "country" ? (byCode.get(h.entry.code) ?? []) : [])) : countries;
    return listed.filter((c) => picked.length === 0 || picked.includes(c.continent));
  }, [countries, hits, picked, q]);
  const shownWars = hits.flatMap((h) => (h.type === "war" ? [h.entry] : []));
  const toggle = (c: Continent) => {
    const next = picked.includes(c) ? picked.filter((p) => p !== c) : [...picked, c];
    setPicked(next.length === continents.length ? [] : next);
  };

  return (
    <div className="flex flex-col gap-4">
      <label className="flex scroll-mt-3 flex-col gap-1.5" htmlFor={`${id}-input`}>
        <span className={FIELD_LABEL}>{t("searchLabel")}</span>
        <input
          id={`${id}-input`}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={(e) => keepResultsAboveKeyboard(e.currentTarget)}
          placeholder={t("searchPlaceholder")}
          autoComplete="off"
          enterKeyHint="search"
          className={INPUT}
        />
      </label>

      <ChipGroup label={t("continentFilter")}>
        <Chip pressed={picked.length === 0} onClick={() => setPicked([])}>
          {t("allContinents")}
        </Chip>
        {continents.map((c) => (
          <Chip key={c} pressed={picked.includes(c)} onClick={() => toggle(c)}>
            {t(`continents.${c}`)}
          </Chip>
        ))}
      </ChipGroup>

      <div aria-live="polite" className="flex flex-col gap-4">
        {shownWars.length > 0 && (
          <section className="flex flex-col gap-2">
            <SectionHeading>{t("matchingWars")}</SectionHeading>
            <ul className="flex flex-col gap-2">
              {shownWars.map((w) => (
                <li key={w.id}>
                  <Link
                    prefetch={false}
                    href={`/war/${w.id}`}
                    className={cn(CARD_LINK, "flex flex-col gap-1")}
                  >
                    <span className={CARD_TITLE}>{w.name}</span>
                    <span className="text-sm text-muted-foreground">
                      <WarDates span={w.span} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {shownCountries.length === 0 && shownWars.length === 0 ? (
          // Without a query nothing can be empty: the chips only offer continents that have a country.
          q ? <EmptyState title={t("noMatch", { query: q })}>{t("noMatchHint")}</EmptyState> : null
        ) : (
          shownCountries.length > 0 && (
            <section className="flex flex-col gap-2">
              {q && <SectionHeading>{t("countries")}</SectionHeading>}
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {shownCountries.map((c) => (
                  <li key={c.code}>
                    <Link
                      prefetch={false}
                      href={`/country/${c.code.toLowerCase()}`}
                      className={cn(CARD_LINK, "flex min-w-0 items-center gap-2")}
                    >
                      <CountryFlag code={c.code} />
                      <span className={cn(CARD_TITLE, "min-w-0 flex-1 truncate")}>{c.name}</span>
                      <span className="shrink-0 text-sm text-muted-foreground">{t("warCount", { count: c.count })}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )
        )}
      </div>
    </div>
  );
}
