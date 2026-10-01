import { createTranslator, type Messages } from "next-intl";
import type { Locale } from "@/i18n/locales";
import { contemporaryNames } from "@/lib/data/culture-copy";
import { localize } from "@/lib/data/localize";
import { defaultPeriod } from "@/lib/data/queries";
import type { Culture } from "@/lib/data/schema";
import { formatYearRange } from "@/lib/years";

// Every string a share image draws, one function per image. The routes render
// these and scripts/build-og-fonts.ts subsets the fonts from ogText, so the
// fonts can't fall behind what a route draws.

export function homeOg(locale: Locale, messages: Messages) {
  const t = createTranslator({ locale, messages });
  return { eyebrow: t("common.appName").toUpperCase(), tagline: t("common.tagline") };
}

export function timelineOg(locale: Locale, messages: Messages) {
  const t = createTranslator({ locale, messages });
  return {
    eyebrow: t("common.appName").toUpperCase(),
    title: t("timeline.title"),
    tagline: t("common.tagline"),
  };
}

export function creditsOg(locale: Locale, messages: Messages) {
  const t = createTranslator({ locale, messages });
  return {
    eyebrow: t("common.appName").toUpperCase(),
    title: t("credits.title"),
    description: t("credits.metaDescription"),
  };
}

export function cultureOg(locale: Locale, messages: Messages, culture: Culture, cultures: readonly Culture[]) {
  const t = createTranslator({ locale, messages });
  const period = defaultPeriod(culture);
  const others = contemporaryNames(culture, cultures, locale, 3);
  return {
    eyebrow: t("common.appName").toUpperCase(),
    name: localize(culture.name, locale),
    nativeName: culture.nativeName?.text ?? null,
    range: formatYearRange(period.latestStart, period.earliestEnd, locale),
    others: others.length > 0 ? `${t("meanwhile.heading")} ${new Intl.ListFormat(locale).format(others)}` : null,
  };
}

/** Every string any share image draws in this locale. */
export function ogText(locale: Locale, messages: Messages, cultures: readonly Culture[]): string[] {
  const copies = [
    homeOg(locale, messages),
    timelineOg(locale, messages),
    creditsOg(locale, messages),
    ...cultures.map((c) => cultureOg(locale, messages, c, cultures)),
  ];
  return copies.flatMap((copy) => Object.values(copy).filter((s): s is string => s !== null));
}
