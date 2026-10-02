import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { JoinedList } from "@/components/joined-list";
import { Link } from "@/i18n/navigation";
import { isListableCountry } from "@/lib/data/countries";
import { countryName } from "@/lib/data/wars";
import today from "../../../data/today.json";

// Tiny, and validated by validate-data before every build, so it ships with
// the component instead of being threaded through every page's props.
const HEARTLAND: Record<string, readonly string[] | undefined> = today;

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
 * A present-day country's flag and name, linking to its country page. Every
 * listable heartland or war-state code has one in every language it appears
 * in (country.test.ts), so only the never-shown and non-UN codes stay plain,
 * and `here`, the country page it is on, which a link would only reload.
 */
export function CountryLink({ code, here }: { code: string; here?: string }) {
  const locale = useLocale();
  const content = (
    <>
      <CountryFlag code={code} />
      {countryName(code, locale)}
    </>
  );
  if (!isListableCountry(code) || code === here) return <span className="inline-flex items-center gap-1">{content}</span>;
  return (
    <Link href={`/country/${code.toLowerCase()}`} className="inline-flex items-center gap-1 underline underline-offset-2">
      {content}
    </Link>
  );
}

/**
 * Flags of the present-day countries where a culture's heartland was, with
 * "Heartland today: Peru" as tooltip and accessible name. `max` trims the
 * flags shown (never the label) where space is tight; `withLabel` writes the
 * label out with each country linking to its page, so use it only outside
 * another link.
 */
export function HeartlandFlags({ cultureId, max, withLabel }: { cultureId: string; max?: number; withLabel?: boolean }) {
  const locale = useLocale();
  const t = useTranslations("common");
  const codes = HEARTLAND[cultureId];
  if (!codes) return null;

  if (withLabel) {
    return (
      <span>
        {t.rich("heartlandTodayLinked", {
          countries: () => <JoinedList items={codes.map((code) => <CountryLink key={code} code={code} />)} />,
        })}
      </span>
    );
  }

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
