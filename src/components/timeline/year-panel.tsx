import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { TimelineCulture, TimelineEvent } from "./timeline-layout";
import type { TimelineActiveCulture } from "./timeline-math";
import { YearRangeText, YearText } from "@/components/settings/year-text";
import { useSettings } from "@/components/settings/use-settings";
import { formatYear } from "@/lib/years";

export type SelectedEvent = { culture: TimelineCulture; event: TimelineEvent };

/**
 * What was alive at the dragged year, or (when a marker was tapped) that
 * event plus what else was happening at the same time.
 */
export function YearPanel({
  year,
  active,
  selected,
  onClose,
}: {
  year: number;
  active: TimelineActiveCulture[];
  selected: SelectedEvent | null;
  onClose: () => void;
}) {
  const locale = useLocale();
  const { eraStyle } = useSettings();
  const t = useTranslations("timeline");
  const tCommon = useTranslations("common");
  const formattedYear = formatYear(year, locale, eraStyle);

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
      <p className="text-sm font-medium">{t(selected ? "alsoHappening" : "activeIn", { year: formattedYear })}</p>
      {active.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("noneActive")}</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {active
            .filter((a) => a.culture.id !== selected?.culture.id)
            .map(({ culture, certain }) => (
              <li key={culture.id} className="flex items-center justify-between gap-2 text-sm">
                <Link href={`/c/${culture.id}`} className="underline-offset-2 hover:underline">
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

