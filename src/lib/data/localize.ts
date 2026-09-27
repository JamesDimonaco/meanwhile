import type { Locale } from "@/i18n/locales";
import type { Culture, LocalizedText } from "./schema";

/** The text in this locale, falling back to English. */
export function localize(text: LocalizedText, locale: Locale): string {
  return text[locale] ?? text.en;
}

/** True when this culture's text in this locale hasn't been checked by a native speaker. */
export function isMachineTranslated(culture: Culture, locale: Locale): boolean {
  return locale !== "en" && !culture.reviewed[locale];
}
