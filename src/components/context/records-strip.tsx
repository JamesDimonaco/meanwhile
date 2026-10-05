import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/locales";
import { localize } from "@/lib/data/localize";
import type { LocalizedText, Period } from "@/lib/data/schema";
import { likelySpan, type RecordKind } from "@/lib/data/records";
import { roundYearsAgo } from "@/lib/years";
import { YearRangeText } from "@/components/settings/year-text";
import { DisputedBadge } from "@/components/culture/disputed-badge";

/** Home: the all-time oldest, newest and longest-lasting cultures, with their numbers. */
export async function RecordsStrip({
  holders,
  locale,
}: {
  holders: { kind: RecordKind; holder: { id: string; name: LocalizedText; period: Period } }[];
  locale: Locale;
}) {
  const t = await getTranslations({ locale, namespace: "context" });

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-medium text-muted-foreground">{t("records")}</h2>
      <ul className="flex flex-col gap-2 text-sm">
        {holders.map(({ kind, holder }) => {
          const span = likelySpan(holder.period);
          return (
            <li key={kind} className="flex flex-wrap items-baseline gap-x-1.5 gap-y-1">
              <span className="text-muted-foreground">{t(kind)}</span>
              <Link href={`/c/${holder.id}`} className="font-medium underline-offset-2 hover:underline">
                {localize(holder.name, locale)}
              </Link>
              <span className="text-muted-foreground">
                {kind === "longest" ? (
                  t("lasted", { count: roundYearsAgo(Math.round(span.duration)) })
                ) : (
                  t.rich("began", {
                    // The midpoint only ranks; showing it would invent a date no source gives (Qing: 1636 or 1644, never 1640).
                    year: () => <YearRangeText start={holder.period.earliestStart} end={holder.period.latestStart} />,
                  })
                )}
              </span>
              {holder.period.disputed && (
                <DisputedBadge note={holder.period.note && localize(holder.period.note, locale)} />
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
