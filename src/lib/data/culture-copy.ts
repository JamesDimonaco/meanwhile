import type { Locale } from "@/i18n/locales";
import { formatYearRange } from "@/lib/years";
import { localize } from "./localize";
import { defaultPeriod, meanwhile } from "./queries";
import type { Culture } from "./schema";

// Shared by generateMetadata (description tag) and the OG image routes, so
// both read the same real content instead of each inventing their own copy.

const META_DESCRIPTION_BUDGET = 155;

/** The first sentence of a block of prose, terminal punctuation included. */
export function firstSentence(text: string, locale: Locale): string {
  const end = locale === "zh" ? text.search(/[。!?！？]/) : text.search(/[.!?](\s|$)/);
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

/**
 * "<Name> (<native>), <date range>. <first sentence of the description>",
 * truncated to the meta-description budget. Real content, not invented copy.
 */
export function cultureDescription(culture: Culture, locale: Locale): string {
  const period = defaultPeriod(culture);
  const range = formatYearRange(period.latestStart, period.earliestEnd, locale);
  // es era labels ("a. e. c.") already end in a period; en/zh ones don't.
  // Avoid stacking a second one.
  const lead =
    locale === "zh"
      ? `${cultureTitle(culture, locale)}，${range}。`
      : `${cultureTitle(culture, locale)}, ${range}${range.endsWith(".") ? "" : "."} `;
  const sentence = firstSentence(localize(culture.description, locale), locale);
  return truncate(`${lead}${sentence}`, META_DESCRIPTION_BUDGET);
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
