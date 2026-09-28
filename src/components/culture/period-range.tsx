import type { Period } from "@/lib/data/schema";
import { YearRangeText } from "@/components/settings/year-text";
import { localize } from "@/lib/data/localize";
import type { Locale } from "@/i18n/locales";
import { DisputedBadge } from "./disputed-badge";
import { periodBarSegments } from "./period-bar";

/**
 * The solid-between, fades-at-the-edges bar from the plan: solid from
 * latestStart to earliestEnd, fading out across each fuzzy edge. Uncertainty
 * shown, not hidden.
 */
export function PeriodRange({ period, locale }: { period: Period; locale: Locale }) {
  const { preFade, solid, postFade } = periodBarSegments(period);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <YearRangeText start={period.latestStart} end={period.earliestEnd} />
        {period.disputed && <DisputedBadge note={period.note && localize(period.note, locale)} />}
      </div>
      <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted" aria-hidden="true">
        <span style={{ width: `${preFade}%` }} className="shrink-0 bg-gradient-to-r from-primary/0 to-primary/70" />
        <span style={{ width: `${solid}%` }} className="shrink-0 bg-primary/70" />
        <span style={{ width: `${postFade}%` }} className="shrink-0 bg-gradient-to-r from-primary/70 to-primary/0" />
      </div>
    </div>
  );
}
