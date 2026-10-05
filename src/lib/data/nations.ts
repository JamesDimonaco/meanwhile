import type { Locale } from "@/i18n/locales";

// No zod or UN member table here: HeartlandFlags, on every page, names countries through this file.

/**
 * The UK's nations with their own country pages, named as each language's
 * Wikipedia names them (Intl has no names for subdivisions). A fixed list,
 * never a general "region within a country" mechanism, which would invite
 * pages for places whose status is disputed. Northern Ireland waits for its
 * own review.
 */
export const NATIONS = {
  "GB-ENG": { en: "England", es: "Inglaterra", zh: "英格兰" },
  "GB-SCT": { en: "Scotland", es: "Escocia", zh: "苏格兰" },
  "GB-WLS": { en: "Wales", es: "Gales", zh: "威尔士" },
} as const satisfies Record<string, Record<Locale, string>>;

export type Nation = keyof typeof NATIONS;

/** The country the nations are part of. */
export const UNION = "GB";

export const isNation = (code: string): code is Nation => Object.hasOwn(NATIONS, code);

/** A nation's civilisations and wars are on the UK's page too: the codes, with GB added when a nation is among them. */
export function withUnion(codes: readonly string[]): string[] {
  return codes.some(isNation) && !codes.includes(UNION) ? [...codes, UNION] : [...codes];
}

// One per language: the home search names the 130-odd countries without a page, in three languages, on the client.
const regionNames = new Map<Locale, Intl.DisplayNames>();

/** A present-day country's or nation's name in the page's language, from its code. */
export function countryName(code: string, locale: Locale): string {
  if (isNation(code)) return NATIONS[code][locale];
  let names = regionNames.get(locale);
  if (!names) regionNames.set(locale, (names = new Intl.DisplayNames([locale], { type: "region" })));
  return names.of(code) ?? code;
}
