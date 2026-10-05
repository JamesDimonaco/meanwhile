export const LOCALES = ["en", "es", "zh"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";
/** Written by the language switcher; read by the root redirect on later visits. */
export const LOCALE_STORAGE_KEY = "meanwhile.locale";

/** BCP 47 tag for the html lang attribute ("zh" alone doesn't say Simplified). */
export const HTML_LANG: Record<Locale, string> = { en: "en", es: "es", zh: "zh-Hans" };

/** The language switcher's label on phones, where the full names push the header onto two rows. */
export const SHORT_LANGUAGE_NAME: Record<Locale, string> = { en: "EN", es: "ES", zh: "中文" };

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}
