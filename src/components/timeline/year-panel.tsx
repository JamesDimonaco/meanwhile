import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { TimelineCulture, TimelineEvent } from "./timeline-layout";
import type { TimelineActiveCulture } from "./timeline-math";
import { YearRangeText, YearText } from "@/components/settings/year-text";
import { NoneInRegions } from "@/components/filters/region-chips";

export type SelectedEvent = { culture: TimelineCulture; event: TimelineEvent };

/**
 * What was alive at the dragged year, or (when a marker was tapped) that
 * event plus what else was happening at the same time. `hiddenByFilter`
 * means the region filter, not the record, left `active` empty.
 */
export function YearPanel({
  year,
  active,
  selected,
  onClose,
  hiddenByFilter,
  onShowAllRegions,
}: {
  year: number;
  active: TimelineActiveCulture[];
  selected: SelectedEvent | null;
  onClose: () => void;
  hiddenByFilter: boolean;
  onShowAllRegions: () => void;
}) {
  const t = useTranslations("timeline");
  const tCommon = useTranslations("common");

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
      {selected && (
        <div className="flex items-start justify-between gap-2 border-b border-border pb-2">
          <div>
            <p className="font-medium">{selected.event.title}</p>
            <p className="text-sm text-muted-foreground">
              {t(`eventTypes.${selected.event.type}`)} · <YearText year={selected.event.start} />
              {selected.event.disputed && <> · {tCommon("disputed")}</>}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-sm text-muted-foreground hover:text-foreground">
            {t("close")}
          </button>
        </div>
      )}
      <p className="text-sm font-medium">{t.rich(selected ? "alsoHappening" : "activeIn", { year: () => <YearText year={year} /> })}</p>
      {active.length === 0 && hiddenByFilter ? (
        <NoneInRegions message="noneInRegions" onShowAll={onShowAllRegions} />
      ) : active.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("noneActive")}</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {active
            .filter((a) => a.culture.id !== selected?.culture.id)
            .map(({ culture, certain }) => (
              <li key={culture.id} className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5 text-sm">
                <Link href={`/c/${culture.id}`} className="min-w-0 underline-offset-2 hover:underline">
                  {culture.name}
                </Link>
                <span className="text-muted-foreground">
                  <YearRangeText start={culture.period.latestStart} end={culture.period.earliestEnd} />
                  {!certain && " ~"}
                </span>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}

