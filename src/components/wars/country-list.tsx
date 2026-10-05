"use client";

import { useId, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Chip } from "@/components/filters/region-chips";
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

  const index = useMemo(() => searchIndex({ locale, countries, wars }), [locale, countries, wars]);
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
      <label className="flex flex-col gap-1.5" htmlFor={`${id}-input`}>
        <span className="text-sm font-medium text-muted-foreground">{t("searchLabel")}</span>
        <input
          id={`${id}-input`}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("searchPlaceholder")}
          autoComplete="off"
          className="rounded-lg border border-border bg-background px-4 py-3 text-base focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        />
      </label>

      <div role="group" aria-label={t("continentFilter")} className="flex flex-wrap gap-1.5">
        <Chip pressed={picked.length === 0} onClick={() => setPicked([])}>
          {t("allContinents")}
        </Chip>
        {continents.map((c) => (
          <Chip key={c} pressed={picked.includes(c)} onClick={() => toggle(c)}>
            {t(`continents.${c}`)}
          </Chip>
        ))}
      </div>

      <div aria-live="polite" className="flex flex-col gap-4">
        {shownWars.length > 0 && (
          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-medium text-muted-foreground">{t("matchingWars")}</h2>
            <ul className="flex flex-col gap-1.5">
              {shownWars.map((w) => (
                <li key={w.id}>
                  <Link
                    href={`/war/${w.id}`}
                    className="flex flex-col gap-0.5 rounded-lg border border-border px-3 py-2.5 hover:bg-muted"
                  >
                    <span className="font-medium">{w.name}</span>
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
          <p className="px-1 text-sm text-muted-foreground">{t("noMatch", { query: q })}</p>
        ) : (
          shownCountries.length > 0 && (
            <section className="flex flex-col gap-2">
              {q && <h2 className="text-sm font-medium text-muted-foreground">{t("countries")}</h2>}
              <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {shownCountries.map((c) => (
                  <li key={c.code}>
                    <Link
                      href={`/country/${c.code.toLowerCase()}`}
                      className="flex min-w-0 items-center gap-2 rounded-lg border border-border px-4 py-3 hover:bg-muted"
                    >
                      <CountryFlag code={c.code} />
                      <span className="min-w-0 flex-1 truncate font-medium">{c.name}</span>
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
