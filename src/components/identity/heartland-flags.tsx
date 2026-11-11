import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { countryName, isNation, UNION } from "@/lib/data/nations";
import today from "../../../data/today.json";

// Tiny, and validated by validate-data before every build, so it ships with
// the component instead of being threaded through every page's props.
export const HEARTLAND: Record<string, readonly string[] | undefined> = today;

/** One present-day country's flag. Decorative: always name the country beside or around it. */
export function CountryFlag({ code }: { code: string }) {
  return (
    <Image
      src={`/flags/${code.toLowerCase()}.svg`}
      alt=""
      width={16}
      height={12}
      className="h-3 w-4 shrink-0 rounded-[2px] ring-1 ring-foreground/15"
    />
  );
}

/**
 * A culture's name with its heartland flags after it. The flags share a no-wrap span with the name's last
 * word (its last two characters where the name has no spaces, as in Chinese), so a flag never wraps onto a
 * line of its own. One order everywhere: name, flags, then any native name.
 */
export function NameWithFlags({ name, cultureId }: { name: string; cultureId: string }) {
  const cut = name.includes(" ") ? name.lastIndexOf(" ") + 1 : Math.max(0, name.length - 2);
  return (
    <>
      {name.slice(0, cut)}
      <span className="whitespace-nowrap">
        {name.slice(cut)}
        {HEARTLAND[cultureId] && "\u00a0"}
        <HeartlandFlags cultureId={cultureId} />
      </span>
    </>
  );
}

/** Trimmed below the number of UK nations listed, the Union Flag stands for them all, not the first one alone. */
const flags = (codes: readonly string[], max?: number) =>
  max !== undefined && codes.length > max && codes.every(isNation) ? [UNION] : codes.slice(0, max);

/**
 * Flags of the present-day countries where a culture's heartland was, with
 * "Heartland today: Peru" as tooltip and accessible name. `max` trims the
 * flags shown (never the label) where space is tight. HeartlandLinks writes
 * the label out with links.
 */
export function HeartlandFlags({ cultureId, max }: { cultureId: string; max?: number }) {
  const locale = useLocale();
  const t = useTranslations("common");
  const codes = HEARTLAND[cultureId];
  if (!codes) return null;

  const countries = new Intl.ListFormat(locale, { type: "conjunction" }).format(codes.map((c) => countryName(c, locale)));
  const label = t("heartlandToday", { countries });
  return (
    <span role="img" aria-label={label} title={label} className="inline-flex shrink-0 items-center gap-0.5 align-[-0.05em]">
      {flags(codes, max).map((code) => (
        <CountryFlag key={code} code={code} />
      ))}
    </span>
  );
}
