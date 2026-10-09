import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { WarSpan } from "@/lib/data/wars";
import type { TimelineCulture, TimelineEvent } from "./timeline-layout";
import { YearText } from "@/components/settings/year-text";
import { WarDates } from "@/components/wars/war-parts";

export type SelectedEvent = { culture: TimelineCulture; event: TimelineEvent };

/** One thing alive at the year line: a culture, or a war on a country's page. */
export type PanelEntry = { id: string; name: string; href: string; span: WarSpan; certain: boolean; color: string };

/**
 * What was alive at the dragged year, or (when a marker was tapped) that
 * event plus what else was happening at the same time. `empty` replaces the
 * list when nothing is.
 */
export function YearPanel({
  year,
  entries,
  selected = null,
  onClose,
  empty,
}: {
  year: number;
  entries: PanelEntry[];
  selected?: SelectedEvent | null;
  onClose?: () => void;
  empty?: ReactNode;
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
      {entries.length === 0 ? (
        (empty ?? <p className="text-sm text-muted-foreground">{t("noneActive")}</p>)
      ) : (
        <ul className="flex flex-col gap-1">
          {entries
            .filter((e) => e.id !== selected?.culture.id)
            .map(({ id, name, href, span, certain, color }) => (
              <li key={id} className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5 text-sm">
                <Link prefetch={false} href={href} className="inline-flex min-w-0 items-baseline gap-1.5 underline-offset-2 hover:underline">
                  <span aria-hidden className="inline-block size-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                  {name}
                </Link>
                <span className="text-muted-foreground">
                  <WarDates span={span} />
                  {!certain && " ~"}
                </span>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}

