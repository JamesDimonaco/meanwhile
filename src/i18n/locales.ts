export const LOCALES = ["en", "es", "zh"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";
/** Written by the language switcher; read by the root redirect on later visits. */
export const LOCALE_STORAGE_KEY = "meanwhile.locale";

/** BCP 47 tag for the html lang attribute ("zh" alone doesn't say Simplified). */
export const HTML_LANG: Record<Locale, string> = { en: "en", es: "es", zh: "zh-Hans" };

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}
