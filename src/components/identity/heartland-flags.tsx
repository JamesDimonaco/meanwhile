import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { countryName } from "@/lib/data/nations";
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
    <span role="img" aria-label={label} title={label} className="inline-flex shrink-0 items-center gap-0.5">
      {codes.slice(0, max).map((code) => (
        <CountryFlag key={code} code={code} />
      ))}
    </span>
  );
}
