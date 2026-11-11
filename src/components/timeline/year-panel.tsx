import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { WarSpan } from "@/lib/data/wars";
import type { TimelineCulture, TimelineEvent } from "./timeline-layout";
import { YearText } from "@/components/settings/year-text";
import { WarDates } from "@/components/wars/war-parts";
import { Button } from "@/components/ui/button";
import { Card, scrollBehavior, TOUCH_AREA } from "@/components/ui/page";
import { cn } from "@/lib/utils";

/** The year panel's anchor: the pinned year bar links to it. One timeline per page. */
export const PANEL_ID = "active-this-year";

/** "43 active this year: see the list", in the pinned bar: the list itself sits below every row. */
export function ActiveCount({ count }: { count: number }) {
  const t = useTranslations("timeline");
  if (count === 0) return <span className="text-sm text-muted-foreground">{t("activeCount", { count })}</span>;
  return (
    // A button, not a #link: the address keeps only ?year=, so a shared link opens on the chart, not the list.
    <button
      type="button"
      onClick={() => {
        const panel = document.getElementById(PANEL_ID);
        panel?.scrollIntoView({ behavior: scrollBehavior(), block: "start" });
        panel?.focus({ preventScroll: true });
      }}
      className={cn(TOUCH_AREA, "inline-flex min-h-6 items-center self-start rounded-sm text-start text-sm underline underline-offset-2 hover:decoration-2 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none")}
    >
      {t("activeCount", { count })}
    </button>
  );
}

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
    <Card className="flex flex-col gap-3">
      {selected && (
        <div className="flex items-start justify-between gap-2 border-b border-border pb-3">
          <div>
            <p className="font-medium">{selected.event.title}</p>
            <p className="text-sm text-muted-foreground">
              {t(`eventTypes.${selected.event.type}`)} · <YearText year={selected.event.start} explain />
              {selected.event.disputed && <> · {tCommon("disputed")}</>}
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            {t("close")}
          </Button>
        </div>
      )}
      <p className="text-base font-semibold">{t.rich(selected ? "alsoHappening" : "activeIn", { year: () => <YearText year={year} explain /> })}</p>
      {entries.length === 0 ? (
        (empty ?? <p className="text-sm text-muted-foreground">{t("noneActive")}</p>)
      ) : (
        <ul className="flex flex-col">
          {entries
            .filter((e) => e.id !== selected?.culture.id)
            .map(({ id, name, href, span, certain, color }) => (
              <li key={id} className="flex flex-wrap items-center justify-between gap-x-3 border-t border-border/60 py-1 text-sm first:border-t-0">
                <Link prefetch={false} href={href} className="inline-flex min-h-9 min-w-0 items-center gap-2 rounded-sm font-medium underline underline-offset-2 hover:decoration-2 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none pointer-coarse:min-h-11">
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
    </Card>
  );
}

