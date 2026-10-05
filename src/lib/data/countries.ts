import { isNation } from "./nations";

// No zod here: client components read CONTINENTS for the filter chips.

/** UN M49 regions, the grouping on the wars country list. */
export const CONTINENTS = ["africa", "americas", "asia", "europe", "oceania"] as const;
export type Continent = (typeof CONTINENTS)[number];

// Codes whose status is disputed, or that would read as a political claim
// next to a flag. The site has to stay reachable in mainland China and neutral
// everywhere else, so these are never shown even though ISO lists them.
export const NEVER_SHOWN: ReadonlySet<string> = new Set(["TW", "HK", "MO", "EH", "PS", "XK"]);

const AF = "africa";
const AM = "americas";
const AS = "asia";
const EU = "europe";
const OC = "oceania";

/** The 193 UN member states (ISO 3166-1 alpha-2) and their M49 region: the only countries the wars pages list. */
export const UN_MEMBERS: Readonly<Record<string, Continent>> = {
  AF: AS, AL: EU, DZ: AF, AD: EU, AO: AF, AG: AM, AR: AM, AM: AS, AU: OC, AT: EU,
  AZ: AS, BS: AM, BH: AS, BD: AS, BB: AM, BY: EU, BE: EU, BZ: AM, BJ: AF, BT: AS,
  BO: AM, BA: EU, BW: AF, BR: AM, BN: AS, BG: EU, BF: AF, BI: AF, CV: AF, KH: AS,
  CM: AF, CA: AM, CF: AF, TD: AF, CL: AM, CN: AS, CO: AM, KM: AF, CG: AF, CD: AF,
  CR: AM, CI: AF, HR: EU, CU: AM, CY: AS, CZ: EU, DK: EU, DJ: AF, DM: AM, DO: AM,
  EC: AM, EG: AF, SV: AM, GQ: AF, ER: AF, EE: EU, SZ: AF, ET: AF, FJ: OC, FI: EU,
  FR: EU, GA: AF, GM: AF, GE: AS, DE: EU, GH: AF, GR: EU, GD: AM, GT: AM, GN: AF,
  GW: AF, GY: AM, HT: AM, HN: AM, HU: EU, IS: EU, IN: AS, ID: AS, IR: AS, IQ: AS,
  IE: EU, IL: AS, IT: EU, JM: AM, JP: AS, JO: AS, KZ: AS, KE: AF, KI: OC, KP: AS,
  KR: AS, KW: AS, KG: AS, LA: AS, LV: EU, LB: AS, LS: AF, LR: AF, LY: AF, LI: EU,
  LT: EU, LU: EU, MG: AF, MW: AF, MY: AS, MV: AS, ML: AF, MT: EU, MH: OC, MR: AF,
  MU: AF, MX: AM, FM: OC, MD: EU, MC: EU, MN: AS, ME: EU, MA: AF, MZ: AF, MM: AS,
  NA: AF, NR: OC, NP: AS, NL: EU, NZ: OC, NI: AM, NE: AF, NG: AF, MK: EU, NO: EU,
  OM: AS, PK: AS, PW: OC, PA: AM, PG: OC, PY: AM, PE: AM, PH: AS, PL: EU, PT: EU,
  QA: AS, RO: EU, RU: EU, RW: AF, KN: AM, LC: AM, VC: AM, WS: OC, SM: EU, ST: AF,
  SA: AS, SN: AF, RS: EU, SC: AF, SL: AF, SG: AS, SK: EU, SI: EU, SB: OC, SO: AF,
  ZA: AF, SS: AF, ES: EU, LK: AS, SD: AF, SR: AM, SE: EU, CH: EU, SY: AS, TJ: AS,
  TZ: AF, TH: AS, TL: AS, TG: AF, TO: OC, TT: AM, TN: AF, TR: AS, TM: AS, TV: OC,
  UG: AF, UA: EU, AE: AS, GB: EU, US: AM, UY: AM, UZ: AS, VU: OC, VE: AM, VN: AS,
  YE: AS, ZM: AF, ZW: AF,
};

/** A code a `today` list may use, and so may have a country page: a UN member not on the never-shown list, or a UK nation. */
export function isListableCountry(code: string): boolean {
  return (Object.hasOwn(UN_MEMBERS, code) && !NEVER_SHOWN.has(code)) || isNation(code);
}

/**
 * Search-only names people type for a country that Intl's names in en, es
 * and zh don't give, on every page: a Spanish or Chinese page is read by
 * people who type "USA" too. Kept small, and never a disputed name: no
 * Malvinas, Burma or Persia, and no never-shown code. A spelling the matcher
 * already reaches stays out ("Turkey" is one edit from a half-typed "Türkiye").
 * - GB: "UK", "Britain" and "Great Britain" are everyday English ("Britain"
 *   whole, so it outranks Neolithic Britain, whose name the reader sees).
 *   "England" is England's own page.
 * - GB-SCT, GB-WLS: Alba and Cymru, each nation's name in its own language.
 * - US: "USA"; "EE. UU."/"EEUU" is how Spanish writes it.
 * - NL: "Holland" and "Holanda", the names most visitors use.
 * - DE, CH, CN: the name a German or Chinese speaker types without an IME
 *   ("Deutschland", "Zhongguo"), and the adjective people search Switzerland by.
 */
export const COUNTRY_ALIASES: Readonly<Record<string, readonly string[]>> = {
  GB: ["UK", "Britain", "Great Britain", "Gran Bretaña"],
  "GB-SCT": ["Alba"],
  "GB-WLS": ["Cymru"],
  US: ["USA", "EE. UU.", "EEUU"],
  NL: ["Holland", "Holanda"],
  DE: ["Deutschland"],
  CH: ["Swiss"],
  CN: ["Zhongguo"],
};

/** Aliases for English pages only: in Spanish "América" is the continent. */
export const ENGLISH_ALIASES: Readonly<Record<string, readonly string[]>> = { US: ["America"] };
