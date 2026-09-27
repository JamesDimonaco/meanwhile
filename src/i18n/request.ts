import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { DEFAULT_LOCALE, type Locale } from "./locales";
import { NAMESPACES } from "./namespaces";
import { routing } from "./routing";

type Json = { [key: string]: Json } | string;

// Missing es/zh keys fall back to English rather than showing a key name.
function withFallback(base: Json, override: Json | undefined): Json {
  if (typeof base === "string") return typeof override === "string" ? override : base;
  const out: { [key: string]: Json } = {};
  const over = typeof override === "object" ? override : {};
  for (const key of Object.keys(base)) out[key] = withFallback(base[key], over[key]);
  return out;
}

async function loadNamespace(locale: Locale, ns: string): Promise<Json> {
  return ((await import(`../../messages/${locale}/${ns}.json`)) as { default: Json }).default;
}

export async function loadMessages(locale: Locale) {
  const entries = await Promise.all(
    NAMESPACES.map(async (ns) => {
      const en = await loadNamespace(DEFAULT_LOCALE, ns);
      return [ns, locale === DEFAULT_LOCALE ? en : withFallback(en, await loadNamespace(locale, ns))] as const;
    }),
  );
  return Object.fromEntries(entries);
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  return { locale, timeZone: "UTC", messages: await loadMessages(locale) };
});
