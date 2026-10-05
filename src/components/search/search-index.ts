import { parseYearQuery } from "@/lib/years";
import type { Locale } from "@/i18n/locales";
import type { LocalizedText, NativeName, Region } from "@/lib/data/schema";
import type { Culture } from "@/lib/data/schema";
import { defaultPeriod } from "@/lib/data/queries";
import { localize } from "@/lib/data/localize";
import type { War } from "@/lib/data/war-schema";
import { countryName, countryTerms, warSpan, warsShownIn, type WarSpan } from "@/lib/data/wars";
import { rank, toTerms, type Ranked } from "./match";

/** The two numbers pages show as a range; nothing search doesn't use. */
export type SearchYearRange = { latestStart: number; earliestEnd: number };

/** The light shape the client-side index searches: no events, facts or sources. */
export type SearchEntry = {
  id: string;
  region: Region;
  name: LocalizedText;
  nativeName?: NativeName;
  aliases: string[];
  period: SearchYearRange;
};

export function toSearchEntry(culture: Culture): SearchEntry {
  const { latestStart, earliestEnd } = defaultPeriod(culture);
  return {
    id: culture.id,
    region: culture.region,
    name: culture.name,
    nativeName: culture.nativeName,
    aliases: culture.aliases,
    period: { latestStart, earliestEnd },
  };
}

function cultureTerms(entry: SearchEntry): string[] {
  const names = [entry.name.en, entry.name.es, entry.name.zh].filter((s): s is string => Boolean(s));
  const native = entry.nativeName ? [entry.nativeName.text] : [];
  return [...names, ...native, ...entry.aliases, entry.id.replace(/-/g, " ")];
}

/** What search matches a war on and what a hit shows, in the page's language: no account, sides or sources. */
export type WarSearchEntry = { id: string; name: string; terms: string[]; span: WarSpan };

/** The wars a page in this language may search: the review gate decides, so a hidden war never reaches the payload. */
export function warSearchEntries(wars: readonly War[], locale: Locale): WarSearchEntry[] {
  return warsShownIn(wars, locale).map((w) => ({
    id: w.id,
    name: localize(w.name, locale),
    terms: [w.name.en, w.name.es, w.name.zh, ...w.aliases, ...w.altNames.map((a) => a.text)],
    span: warSpan(w),
  }));
}

/** A country with a page, named in the page's language: what a hit shows and what it is found by. */
export type CountrySearchEntry = { code: string; name: string; terms: string[] };

/** Pass the codes with a page in this language (countryCodes), so a hit never links to a missing page. */
export function countrySearchEntries(codes: readonly string[], locale: Locale): CountrySearchEntry[] {
  return codes.map((code) => ({ code, name: countryName(code, locale), terms: countryTerms(code) }));
}

export type SearchHit =
  | { type: "year"; year: number }
  | { type: "country"; entry: CountrySearchEntry }
  | { type: "culture"; entry: SearchEntry }
  | { type: "war"; entry: WarSearchEntry };

type NameHit = Exclude<SearchHit, { type: "year" }>;
export type SearchIndex = readonly Ranked<NameHit>[];

const byKey = <T>(key: (t: T) => string) => (a: T, b: T) => key(a).localeCompare(key(b));

/**
 * Prepares the terms once, on the client. On equal scores a country comes
 * first, then a civilisation, then a war: "egypt" is the country by that
 * name before Ancient Egypt, which has it as an alias.
 */
export function searchIndex({
  countries = [],
  cultures = [],
  wars = [],
}: {
  countries?: readonly CountrySearchEntry[];
  cultures?: readonly SearchEntry[];
  wars?: readonly WarSearchEntry[];
}): SearchIndex {
  return [
    ...[...countries].sort(byKey((c) => c.code)).map((entry) => ({ item: { type: "country" as const, entry }, terms: toTerms(entry.terms) })),
    ...[...cultures].sort(byKey((c) => c.id)).map((entry) => ({ item: { type: "culture" as const, entry }, terms: toTerms(cultureTerms(entry)) })),
    ...[...wars].sort(byKey((w) => w.id)).map((entry) => ({ item: { type: "war" as const, entry }, terms: toTerms(entry.terms) })),
  ];
}

/** A typed year ("1200 BCE", "公元前1200年") first, then every name hit, best first. */
export function search(query: string, index: SearchIndex): SearchHit[] {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const year = parseYearQuery(trimmed);
  const names: SearchHit[] = rank(trimmed, index);
  return year === null ? names : [{ type: "year", year }, ...names];
}
