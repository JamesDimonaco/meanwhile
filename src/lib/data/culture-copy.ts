import type { Locale } from "@/i18n/locales";
import { formatIsoDate, formatYear, formatYearRange } from "@/lib/years";
import { localize } from "./localize";
import { defaultPeriod, meanwhile } from "./queries";
import type { Culture } from "./schema";
import type { War } from "./war-schema";
import { warSpan } from "./wars";

// Shared by generateMetadata (description tag) and the OG image routes, so
// both read the same real content instead of each inventing their own copy.

const META_DESCRIPTION_BUDGET = 155;

/**
 * The first sentence of a block of prose, terminal punctuation included. In
 * en/es a sentence ends only where the next one starts with a capital (or
 * ¿¡), so abbreviations like the es era label "a. e. c." don't end it.
 */
export function firstSentence(text: string, locale: Locale): string {
  const end = locale === "zh" ? text.search(/[。!?！？]/) : text.search(/[.!?](?=\s+[\p{Lu}¿¡]|$)/u);
  return end === -1 ? text : text.slice(0, end + 1);
}

/** Cuts to at most `max` characters, on a word boundary where there is one nearby, with an ellipsis. */
export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  const trimmed = lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut;
  return `${trimmed.trimEnd()}…`;
}

function wrapNative(native: string, locale: Locale): string {
  return locale === "zh" ? `（${native}）` : ` (${native})`;
}

/** "<Name> (<native name>)", or just the name when there's no native name. */
export function cultureTitle(culture: Culture, locale: Locale): string {
  const name = localize(culture.name, locale);
  return culture.nativeName ? `${name}${wrapNative(culture.nativeName.text, locale)}` : name;
}

/** "<name>, <dates>. " (zh "<name>，<dates>。"), opening a meta description. */
function lead(name: string, dates: string, locale: Locale): string {
  // es era labels ("a. e. c.") already end in a period; en/zh ones don't.
  // Avoid stacking a second one.
  return locale === "zh" ? `${name}，${dates}。` : `${name}, ${dates}${dates.endsWith(".") ? "" : "."} `;
}

/**
 * "<Name> (<native>), <date range>. <first sentence of the description>",
 * truncated to the meta-description budget. Real content, not invented copy.
 */
export function cultureDescription(culture: Culture, locale: Locale): string {
  const period = defaultPeriod(culture);
  const range = formatYearRange(period.latestStart, period.earliestEnd, locale);
  const sentence = firstSentence(localize(culture.description, locale), locale);
  return truncate(`${lead(cultureTitle(culture, locale), range, locale)}${sentence}`, META_DESCRIPTION_BUDGET);
}

/**
 * A war's dates in plain text, as WarDates shows them: its likely span, or
 * for an ongoing war the wars namespace's `ongoing` message, which the caller
 * fills (`start` is the formatted start year, `date` the asOf date).
 */
export function warYears(war: War, locale: Locale, ongoing: (start: string, date: string) => string): string {
  const { start, end, asOf } = warSpan(war);
  if (end !== null || asOf === null) return formatYearRange(start, end ?? start, locale);
  return ongoing(formatYear(start, locale), formatIsoDate(asOf, locale));
}

/** "<Name>, <years>. <outcome>", truncated to the meta-description budget. */
export function warDescription(war: War, locale: Locale, years: string): string {
  return truncate(`${lead(localize(war.name, locale), years, locale)}${localize(war.outcome, locale)}`, META_DESCRIPTION_BUDGET);
}

/** Up to `count` other cultures alive during this one's default period, for "Meanwhile… X, Y and Z" copy. */
export function contemporaryNames(
  culture: Culture,
  cultures: readonly Culture[],
  locale: Locale,
  count = 3,
): string[] {
  return meanwhile(culture, cultures)
    .slice(0, count)
    .map((card) => localize(card.culture.name, locale));
}
