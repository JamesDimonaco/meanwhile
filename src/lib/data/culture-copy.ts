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
/** About what search results show of a title before cutting it. */
const TITLE_BUDGET = 60;

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

function bracket(text: string, locale: Locale): string {
  return locale === "zh" ? `（${text}）` : ` (${text})`;
}

/** "<Name> (<native name>)", or just the name when there's no native name or the name already contains it (商朝, not 商朝（商）). */
export function cultureTitle(culture: Culture, locale: Locale): string {
  const name = localize(culture.name, locale);
  const native = culture.nativeName?.text;
  return native && !name.includes(native) ? `${name}${bracket(native, locale)}` : name;
}

/**
 * A culture page's <title>: the caller's wording around name and dates (the
 * culture namespace's `metaTitle`) when it fits TITLE_BUDGET, otherwise just
 * "<Name> (<dates>)". The native name stays out: it costs length and isn't
 * what people search with.
 */
export function cultureMetaTitle(culture: Culture, locale: Locale, wording: (name: string, years: string) => string): string {
  const name = localize(culture.name, locale);
  const period = defaultPeriod(culture);
  const years = formatYearRange(period.latestStart, period.earliestEnd, locale);
  const long = wording(name, years);
  return [...long].length <= TITLE_BUDGET ? long : `${name}${bracket(years, locale)}`;
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

/** "<Name> (<years>)" for an ended war; an ongoing war's as-of date reads as noise in a title, so its name alone. */
export function warTitle(war: War, locale: Locale, years: string): string {
  const name = localize(war.name, locale);
  return warSpan(war).end === null ? name : `${name}${bracket(years, locale)}`;
}

/**
 * "<Name>, <years>. <outcome>", truncated to the meta-description budget. An
 * ongoing war's dates are the wars namespace's `ongoingSince` message, which
 * the caller fills: not WarDates' "– ongoing", since an outcome can open
 * with "Ongoing:", and `named` drops the start year when the name carries it
 * ("Russo-Ukrainian war (2022–present)").
 */
export function warDescription(
  war: War,
  locale: Locale,
  since: (start: string, date: string, named: boolean) => string,
): string {
  const name = localize(war.name, locale);
  const { start, end, asOf } = warSpan(war);
  const dates =
    end !== null || asOf === null
      ? formatYearRange(start, end ?? start, locale)
      : since(formatYear(start, locale), formatIsoDate(asOf, locale), name.includes(String(start)));
  return truncate(`${lead(name, dates, locale)}${localize(war.outcome, locale)}`, META_DESCRIPTION_BUDGET);
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
