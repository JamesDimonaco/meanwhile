import type { Messages } from "next-intl";
import { DEFAULT_LOCALE, type Locale } from "./locales";
import { NAMESPACES } from "./namespaces";

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

/** Every namespace for a locale, English filling any gap. Outside next-intl too (scripts/build-og-fonts.ts). */
export async function loadMessages(locale: Locale): Promise<Messages> {
  const entries = await Promise.all(
    NAMESPACES.map(async (ns) => {
      const en = await loadNamespace(DEFAULT_LOCALE, ns);
      return [ns, locale === DEFAULT_LOCALE ? en : withFallback(en, await loadNamespace(locale, ns))] as const;
    }),
  );
  // withFallback keeps exactly the English files' shape, which is what Messages is typed from.
  return Object.fromEntries(entries) as Messages;
}
