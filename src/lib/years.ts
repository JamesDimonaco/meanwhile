import type { Locale } from "@/i18n/locales";

/**
 * Years are stored as signed integers in astronomical numbering:
 * 1 CE = 1, 1 BCE = 0, 2 BCE = -1, 1200 BCE = -1199.
 * Convert only at the display edge; there is no year zero on screen.
 */

export type Era = "BCE" | "CE";
/** "ce" = CE/BCE (default), "ad" = BC/AD (optional user toggle). */
export type EraStyle = "ce" | "ad";

export function toDisplayYear(year: number): { year: number; era: Era } {
  return year <= 0 ? { year: 1 - year, era: "BCE" } : { year, era: "CE" };
}

export function fromDisplayYear(year: number, era: Era): number {
  if (!Number.isInteger(year) || year < 1) {
    throw new RangeError(`Display years start at 1, got ${year}`);
  }
  return era === "BCE" ? 1 - year : year;
}

/** Cliopatria's BCE years are negative with no year zero: its -600 is 600 BCE. */
export function fromCliopatriaYear(year: number): number {
  return year < 0 ? fromDisplayYear(-year, "BCE") : year;
}

const NBSP = "\u00a0";

// Era labels are locale data like CLDR, kept here (not in messages) so the
// formatting rules and their tests live together.
const ERA_LABELS: Record<Exclude<Locale, "zh">, Record<EraStyle, Record<Era, string>>> = {
  en: { ce: { BCE: "BCE", CE: "CE" }, ad: { BCE: "BC", CE: "AD" } },
  es: { ce: { BCE: "a. e. c.", CE: "e. c." }, ad: { BCE: "a. C.", CE: "d. C." } },
};

function formatNumber(n: number, locale: Locale): string {
  return new Intl.NumberFormat(locale, { useGrouping: "min2" }).format(n);
}

function suffixLabel(locale: Exclude<Locale, "zh">, style: EraStyle, era: Era): string {
  return ERA_LABELS[locale][style][era].replace(/ /g, NBSP);
}

/** Chinese uses 公元前/公元 for both styles; there is no religious variant. */
export function formatYear(year: number, locale: Locale, style: EraStyle = "ce"): string {
  const d = toDisplayYear(year);
  const n = formatNumber(d.year, locale);
  if (locale === "zh") return `${d.era === "BCE" ? "公元前" : "公元"}${n}年`;
  return `${n}${NBSP}${suffixLabel(locale, style, d.era)}`;
}

export function formatYearRange(
  start: number,
  end: number,
  locale: Locale,
  style: EraStyle = "ce",
): string {
  const a = toDisplayYear(start);
  const b = toDisplayYear(end);
  if (a.era !== b.era) {
    const sep = locale === "zh" ? "—" : " – ";
    return `${formatYear(start, locale, style)}${sep}${formatYear(end, locale, style)}`;
  }
  const na = formatNumber(a.year, locale);
  const nb = formatNumber(b.year, locale);
  if (locale === "zh") {
    return a.era === "BCE" ? `公元前${na}—前${nb}年` : `公元${na}—${nb}年`;
  }
  return `${na}–${nb}${NBSP}${suffixLabel(locale, style, a.era)}`;
}

// en-GB, not en: user-facing dates are day first.
const DATE_LOCALE: Record<Locale, string> = { en: "en-GB", es: "es", zh: "zh-Hans" };

/** A stored YYYY-MM-DD date for display ("30 September 2026"), read as UTC so no time zone shifts the day. */
export function formatIsoDate(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(DATE_LOCALE[locale], { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${iso}T00:00:00Z`),
  );
}

/** Call on the client: pages are prerendered, so server code runs at build time. */
export function currentYear(): number {
  return new Date().getFullYear();
}

export function yearsAgo(year: number, now: number): number {
  return now - year;
}

/** For the "about N years ago" toggle: 3225 -> 3200, 456 -> 460, 45 -> 45. */
export function roundYearsAgo(n: number): number {
  if (n >= 1000) return Math.round(n / 100) * 100;
  if (n >= 100) return Math.round(n / 10) * 10;
  return n;
}

// Era tokens after stripping dots and spaces ("a. e. c." -> "aec").
const BCE_TOKENS = new Set(["bce", "bc", "aec", "ac", "adec", "ane"]);
const CE_TOKENS = new Set(["ce", "ad", "ec", "dc", "ddec", "ne"]);

const APPROX_PREFIX = /^(circa|ca\.?|c\.|~|约|約|hacia|h\.)\s*/;

/**
 * Parse a year typed by a person: "1200 BCE", "1200 BC", "公元前1200年",
 * "1200 a. C.", "500 CE", "AD 500", "c. 1200 BCE". Returns an astronomical year.
 * A bare number is CE. A leading minus means BCE the human way ("-1200" is
 * 1200 BCE, i.e. -1199), because nobody types astronomical years; use
 * parseYearParam for machine values such as ?year=.
 */
export function parseYearQuery(input: string): number | null {
  let s = input.normalize("NFKC").trim().toLowerCase();
  s = s.replace(APPROX_PREFIX, "");
  s = s.replace(/(\d)[,.\s'\u00a0\u202f](?=\d{3}(?!\d))/g, "$1");

  const zh = /^(公元前|前|公元)?(\d+)(年)?$/.exec(s);
  if (zh && (zh[1] || zh[3])) {
    return toAstronomical(Number(zh[2]), zh[1] === "公元前" || zh[1] === "前" ? "BCE" : "CE");
  }

  const signed = /^([-+])?(\d+)$/.exec(s);
  if (signed) return toAstronomical(Number(signed[2]), signed[1] === "-" ? "BCE" : "CE");

  const suffix = /^(\d+)\s*([a-z][a-z.\s]*)$/.exec(s);
  const prefix = /^([a-z][a-z.\s]*?)\s*(\d+)$/.exec(s);
  const [digits, token] = suffix ? [suffix[1], suffix[2]] : prefix ? [prefix[2], prefix[1]] : [];
  if (digits === undefined || token === undefined) return null;
  const era = eraFromToken(token.replace(/[.\s]/g, ""));
  return era ? toAstronomical(Number(digits), era) : null;
}

function eraFromToken(token: string): Era | null {
  if (BCE_TOKENS.has(token)) return "BCE";
  if (CE_TOKENS.has(token)) return "CE";
  return null;
}

function toAstronomical(year: number, era: Era): number | null {
  return year >= 1 ? fromDisplayYear(year, era) : null;
}

/** Parse the ?year= URL param: a plain astronomical integer (-1199 = 1200 BCE). */
export function parseYearParam(value: string | null): number | null {
  if (value === null || !/^-?\d+$/.test(value)) return null;
  return Number(value);
}
