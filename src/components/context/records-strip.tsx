import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/locales";
import { localize } from "@/lib/data/localize";
import type { CultureRef } from "@/lib/data/queries";
import { likelySpan, type RecordKind } from "@/lib/data/records";
import { roundYearsAgo } from "@/lib/years";
import { YearText } from "@/components/settings/year-text";
import { DisputedBadge } from "@/components/culture/disputed-badge";

/** Home: the all-time oldest, newest and longest-lasting cultures, with their numbers. */
export async function RecordsStrip({
  holders,
  locale,
}: {
  holders: { kind: RecordKind; culture: CultureRef }[];
  locale: Locale;
}) {
  const t = await getTranslations({ locale, namespace: "context" });

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-medium text-muted-foreground">{t("records")}</h2>
      <ul className="flex flex-col gap-2 text-sm">
        {holders.map(({ kind, culture }) => {
          const span = likelySpan(culture.period);
          return (
            <li key={kind} className="flex flex-wrap items-baseline gap-x-1.5 gap-y-1">
              <span className="text-muted-foreground">{t(kind)}</span>
              <Link href={`/c/${culture.id}`} className="font-medium underline-offset-2 hover:underline">
                {localize(culture.name, locale)}
              </Link>
              <span className="text-muted-foreground">
                {kind === "longest" ? (
                  t("lasted", { count: roundYearsAgo(Math.round(span.duration)) })
                ) : (
                  t.rich("began", { year: () => <YearText year={Math.round(span.start)} /> })
                )}
              </span>
              {culture.period.disputed && (
                <DisputedBadge note={culture.period.note && localize(culture.period.note, locale)} />
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
