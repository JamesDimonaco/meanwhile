import { parseYearQuery } from "@/lib/years";
import type { Locale } from "@/i18n/locales";
import type { LocalizedText, NativeName, Region } from "@/lib/data/schema";
import type { Culture } from "@/lib/data/schema";
import { defaultPeriod } from "@/lib/data/queries";
import { localize } from "@/lib/data/localize";
import type { War } from "@/lib/data/war-schema";
import { warSpan, warsShownIn, type WarSpan } from "@/lib/data/wars";

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

export type SearchResult = { type: "culture"; entry: SearchEntry } | { type: "year"; year: number };

// Strips accents (NFKD splits "ā" into "a" + combining macron, then the
// marks are dropped) so a phone keyboard without tone marks still matches
// data's accented pinyin aliases. CJK text has no combining marks to strip,
// so it passes through unchanged.
export function normalize(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

function candidates(entry: SearchEntry): string[] {
  const names = [entry.name.en, entry.name.es, entry.name.zh].filter((s): s is string => Boolean(s));
  const native = entry.nativeName ? [entry.nativeName.text] : [];
  return [...names, ...native, ...entry.aliases, entry.id.replace(/-/g, " ")];
}

/** Lower = better: exact match, then prefix, then substring. */
function matchScore(query: string, terms: readonly string[]): number | null {
  let best: number | null = null;
  for (const raw of terms) {
    const candidate = normalize(raw);
    if (!candidate) continue;
    const score = candidate === query ? 0 : candidate.startsWith(query) ? 1 : candidate.includes(query) ? 2 : null;
    if (score !== null && (best === null || score < best)) best = score;
  }
  return best;
}

/**
 * Ranks cultures by name, native name and alias (pinyin included, accent
 * insensitive) against the typed query, and recognises a typed year
 * ("1200 BCE", "商 fails but 公元前1200年 succeeds") ahead of any name match.
 */
export function search(query: string, entries: readonly SearchEntry[], limit = 8): SearchResult[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const results: SearchResult[] = [];
  const year = parseYearQuery(trimmed);
  if (year !== null) results.push({ type: "year", year });

  const normalizedQuery = normalize(trimmed);
  const matches = entries
    .map((entry) => ({ entry, score: matchScore(normalizedQuery, candidates(entry)) }))
    .filter((m): m is { entry: SearchEntry; score: number } => m.score !== null)
    .sort((a, b) => a.score - b.score || a.entry.id.localeCompare(b.entry.id));

  for (const { entry } of matches) {
    if (results.length >= limit) break;
    results.push({ type: "culture", entry });
  }
  return results.slice(0, limit);
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

/** Wars by title in any language, alias or a side's own name, ranked like cultures. */
export function searchWars(query: string, wars: readonly WarSearchEntry[], limit = 5): WarSearchEntry[] {
  const q = normalize(query);
  if (!q) return [];
  return wars
    .map((entry) => ({ entry, score: matchScore(q, entry.terms) }))
    .filter((m): m is { entry: WarSearchEntry; score: number } => m.score !== null)
    .sort((a, b) => a.score - b.score || a.entry.id.localeCompare(b.entry.id))
    .slice(0, limit)
    .map((m) => m.entry);
}
