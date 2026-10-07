import { useLocale, useTranslations } from "next-intl";
import { JoinedList } from "@/components/joined-list";
import { YearRangeText } from "@/components/settings/year-text";
import { REGION_COLOR, WAR_COLOR } from "@/components/timeline/timeline-row";
import { WarRow, type CultureNames } from "@/components/wars/war-parts";
import type { Locale } from "@/i18n/locales";
import { Link } from "@/i18n/navigation";
import { itemBounds, itemId, type CountryItem } from "@/lib/data/country";
import { localize } from "@/lib/data/localize";
import { itemHref } from "./item-href";

const href = (item: CountryItem) => itemHref({ kind: item.kind, id: itemId(item) });
const name = (item: CountryItem, locale: Locale) =>
  localize(item.kind === "culture" ? item.culture.name : item.war.name, locale);

/**
 * One civilisation or war on a country's page: what it is, its dates, a war's
 * sides and outcome (WarRow), and the others here it overlapped with.
 */
export function CountryItemCard({
  item,
  overlaps,
  cultureNames,
  country,
}: {
  item: CountryItem;
  overlaps: readonly CountryItem[];
  cultureNames: CultureNames;
  /** The page's country code. */
  country: string;
}) {
  const locale = useLocale();
  const t = useTranslations("country");
  const color = item.kind === "culture" ? REGION_COLOR[item.culture.region] : WAR_COLOR;

  const kind = (
    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <span aria-hidden className="inline-block size-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      {t("kind", { kind: item.kind })}
    </p>
  );
  const sameTime = overlaps.length > 0 && (
    <p className="text-sm">
      {t.rich("sameTime", {
        label: (chunks) => <span className="text-muted-foreground">{chunks}</span>,
        items: () => (
          <JoinedList
            items={overlaps.map((other) => (
              <Link prefetch={false} key={itemId(other)} href={href(other)} className="underline underline-offset-2">
                {name(other, locale)}
              </Link>
            ))}
          />
        ),
      })}
    </p>
  );

  if (item.kind === "war") {
    return (
      <WarRow war={item.war} cultureNames={cultureNames} here={country} header={kind}>
        {sameTime}
      </WarRow>
    );
  }
  const bounds = itemBounds(item);
  return (
    <article className="flex flex-col gap-1.5 rounded-lg border border-border px-4 py-3">
      {kind}
      <Link prefetch={false} href={href(item)} className="font-medium underline-offset-2 hover:underline">
        {name(item, locale)}
      </Link>
      <span className="text-sm text-muted-foreground">
        <YearRangeText start={bounds.latestStart} end={bounds.earliestEnd} />
      </span>
      {sameTime}
    </article>
  );
}
