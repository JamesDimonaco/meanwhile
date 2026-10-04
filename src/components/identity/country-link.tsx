import { useLocale, useTranslations } from "next-intl";
import { CountryFlag, HEARTLAND } from "@/components/identity/heartland-flags";
import { JoinedList } from "@/components/joined-list";
import { Link } from "@/i18n/navigation";
import { isListableCountry } from "@/lib/data/countries";
import { countryName } from "@/lib/data/wars";

// Apart from HeartlandFlags, which client components on every page use, so
// the UN member table stays out of their shared chunk.

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

/** "Heartland today: Peru", each country linking to its page; use it only outside another link. */
export function HeartlandLinks({ cultureId }: { cultureId: string }) {
  const t = useTranslations("common");
  const codes = HEARTLAND[cultureId];
  if (!codes) return null;
  return (
    <span>
      {t.rich("heartlandTodayLinked", {
        countries: () => <JoinedList items={codes.map((code) => <CountryLink key={code} code={code} />)} />,
      })}
    </span>
  );
}
