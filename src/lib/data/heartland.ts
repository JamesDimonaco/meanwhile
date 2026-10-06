import { z } from "zod";
import { NEVER_SHOWN } from "./countries";
import { isNation, UNION, withUnion } from "./nations";
import { duplicates, TodayCode } from "./schema";

/** A heartland, not an empire's largest extent: rarely more than one country. */
export const MAX_HEARTLAND_COUNTRIES = 3;

/** data/today.json: culture id -> the countries its heartland lies in today: ISO 3166-1 alpha-2 codes, or a UK nation (GB-SCT). */
export const Today = z.record(
  z.string(),
  z.array(TodayCode).min(1).max(MAX_HEARTLAND_COUNTRIES),
);

export type HeartlandInput = {
  today: unknown;
  registryIds: readonly string[];
  /** Every ISO 3166-1 alpha-2 code (flag-icons' country list, iso: true). */
  isoCodes: readonly string[];
  /** File names in public/flags. */
  flagFiles: readonly string[];
  /** Every code in the wars' `today` lists: they need flags too. */
  warCodes?: readonly string[];
};

/** Pure so it can be tested; readDataset feeds it the files on disk. */
export function validateHeartland({ today, registryIds, isoCodes, flagFiles, warCodes = [] }: HeartlandInput): string[] {
  const parsed = Today.safeParse(today);
  if (!parsed.success) {
    return parsed.error.issues.map((i) => `data/today.json: ${i.path.join(".") || "(root)"}: ${i.message}`);
  }
  const errors: string[] = [];
  const entries = Object.entries(parsed.data);
  const iso = new Set(isoCodes);

  for (const id of registryIds) {
    if (!(id in parsed.data)) errors.push(`data/today.json: "${id}" has no entry (add the country its heartland lies in today)`);
  }
  for (const [id, codes] of entries) {
    if (!registryIds.includes(id)) errors.push(`data/today.json: "${id}" is not in data/registry.json`);
    for (const dup of duplicates(codes)) errors.push(`data/today.json: ${id}: "${dup}" listed twice`);
    for (const code of codes) {
      if (!iso.has(code) && !isNation(code)) errors.push(`data/today.json: ${id}: "${code}" is not an ISO 3166-1 alpha-2 code`);
      if (code === UNION && codes.some(isNation)) {
        errors.push(`data/today.json: ${id}: "${UNION}" is implied by ${codes.filter(isNation).join(", ")}; drop it`);
      }
      if (NEVER_SHOWN.has(code)) {
        errors.push(`data/today.json: ${id}: "${code}" is never shown (disputed or politically loaded); use the undisputed heartland`);
      }
    }
  }

  // withUnion: the UK page and the nations' "Part of the United Kingdom" line draw its flag.
  const used = new Set(withUnion([...entries.flatMap(([, codes]) => codes), ...warCodes]).map((c) => `${c.toLowerCase()}.svg`));
  for (const file of [...used].sort()) {
    if (!flagFiles.includes(file)) errors.push(`public/flags/${file} is missing (run pnpm sync-flags)`);
  }
  for (const file of flagFiles) {
    if (!used.has(file)) errors.push(`public/flags/${file} is not used by data/today.json or any war (run pnpm sync-flags)`);
  }
  return errors;
}
