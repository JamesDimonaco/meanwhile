import { parseYearQuery } from "@/lib/years";
import { LOCALES, type Locale } from "@/i18n/locales";
import type { LocalizedText, NativeName, Region } from "@/lib/data/schema";
import type { Culture } from "@/lib/data/schema";
import { defaultPeriod } from "@/lib/data/queries";
import { localize } from "@/lib/data/localize";
import type { War } from "@/lib/data/war-schema";
import { NEVER_SHOWN, UN_MEMBERS } from "@/lib/data/countries";
import { countrySearchNames, warSpan, warsShownIn, type CountrySearchNames, type WarSpan } from "@/lib/data/wars";
import { isPinyin, rank, toTerms, type Ranked, type Term } from "./match";

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

/** What search matches a war on and what a hit shows, in the page's language: no account, sides or sources. */
export type WarSearchEntry = { id: string; name: string; english: string; terms: string[]; span: WarSpan };

/** The wars a page in this language may search: the review gate decides, so a hidden war never reaches the payload. */
export function warSearchEntries(wars: readonly War[], locale: Locale): WarSearchEntry[] {
  return warsShownIn(wars, locale).map((w) => ({
    id: w.id,
    name: localize(w.name, locale),
    english: w.name.en,
    terms: [...LOCALES.filter((l) => l !== "en" && l !== locale).map((l) => w.name[l]), ...w.aliases, ...w.altNames.map((a) => a.text)],
    span: warSpan(w),
  }));
}

/** A country with a page, named in the page's language: what a hit shows and what it is found by. */
export type CountrySearchEntry = CountrySearchNames & { code: string };

/** Pass the codes with a page in this language (countryCodes), so a hit never links to a missing page. */
export function countrySearchEntries(codes: readonly string[], locale: Locale): CountrySearchEntry[] {
  return codes.map((code) => ({ code, ...countrySearchNames(code, locale) }));
}

export type SearchHit =
  | { type: "year"; year: number }
  | { type: "country"; entry: CountrySearchEntry }
  | { type: "culture"; entry: SearchEntry }
  | { type: "war"; entry: WarSearchEntry };

type NameHit = Exclude<SearchHit, { type: "year" }>;
/** `unlisted`: the names, in every language, of places the site has no page for. */
export type SearchIndex = { items: readonly Ranked<NameHit>[]; unlisted: readonly Term[] };

const byKey = <T>(key: (t: T) => string) => (a: T, b: T) => key(a).localeCompare(key(b));

/** The never-shown places, and with `allPages` every UN member not in `listed`, named as a listed country is. */
function unlistedCountries(listed: readonly CountrySearchEntry[], allPages: boolean, locale: Locale): Term[] {
  const paged = new Set(listed.map((c) => c.code));
  const codes = [...NEVER_SHOWN, ...(allPages ? Object.keys(UN_MEMBERS).filter((code) => !paged.has(code)) : [])];
  return codes.flatMap((code) => {
    const { name, english, terms } = countrySearchNames(code, locale);
    return toTerms({ shown: [name], latin: [english], other: terms });
  });
}

/**
 * Prepares the terms once, on the client, with the names a row shows in the
 * page's language first. On equal scores a country comes first, then a
 * civilisation, then a war: "egypt" is the country by that name before
 * Ancient Egypt, which has it as an alias.
 */
export function searchIndex({
  locale,
  countries = [],
  cultures = [],
  wars = [],
  allCountryPages = false,
  countryInside = false,
}: {
  locale: Locale;
  countries?: readonly CountrySearchEntry[];
  cultures?: readonly SearchEntry[];
  wars?: readonly WarSearchEntry[];
  /** `countries` is every country with a page in this language (the home page), so another country's name finds nothing. */
  allCountryPages?: boolean;
  /** A country's name matches anywhere from three letters ("stan", "land"), as the wars list's filter always has. */
  countryInside?: boolean;
}): SearchIndex {
  // A reader typing Latin letters knows the English name, and a Chinese civilisation's pinyin.
  const cultureTerms = (c: SearchEntry) =>
    toTerms({
      shown: [localize(c.name, locale), ...(c.nativeName ? [c.nativeName.text] : [])],
      latin: [c.name.en, ...(c.nativeName?.lang.startsWith("zh") ? c.aliases.filter(isPinyin) : [])],
      other: [c.name.es, c.name.zh, ...c.aliases, c.id.replace(/-/g, " ")].filter((s): s is string => Boolean(s)),
    });
  const terms = (entry: { name: string; english: string; terms: readonly string[] }, inside = false) =>
    toTerms({ shown: [entry.name], latin: [entry.english], other: entry.terms, inside });
  return {
    items: [
      ...[...countries].sort(byKey((c) => c.code)).map((entry) => ({ item: { type: "country" as const, entry }, terms: terms(entry, countryInside) })),
      ...[...cultures]
        .sort(byKey((c) => c.id))
        .map((entry) => ({ item: { type: "culture" as const, entry }, terms: cultureTerms(entry) })),
      ...[...wars].sort(byKey((w) => w.id)).map((entry) => ({ item: { type: "war" as const, entry }, terms: terms(entry) })),
    ],
    unlisted: unlistedCountries(countries, allCountryPages, locale),
  };
}

/** A typed year ("1200 BCE", "公元前1200年") first, then every name hit, best first. */
export function search(query: string, index: SearchIndex): SearchHit[] {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const year = parseYearQuery(trimmed);
  const names: SearchHit[] = rank(trimmed, index.items, index.unlisted);
  return year === null ? names : [{ type: "year", year }, ...names];
}
