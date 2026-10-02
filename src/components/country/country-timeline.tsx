"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import type { ScaleLinear } from "d3-scale";
import { Link } from "@/i18n/navigation";
import { TimelineChart } from "@/components/timeline/timeline-chart";
import { layoutCountryRows, type TimelineBar } from "@/components/timeline/timeline-layout";
import {
  BAR_HIT_WIDTH,
  MIN_BAR_WIDTH,
  activeBars,
  atLeast,
  computeYearDomain,
  padDomain,
} from "@/components/timeline/timeline-math";
import { PeriodBar, REGION_COLOR, RowHeader, RowLabel, WAR_COLOR } from "@/components/timeline/timeline-row";
import { useYearParam } from "@/components/timeline/use-year-param";
import { YearPanel } from "@/components/timeline/year-panel";

const BAR_INSET = 8;

const barHref = (bar: TimelineBar) => (bar.kind === "culture" ? `/c/${bar.id}` : `/war/${bar.id}`);
const barColor = (bar: TimelineBar) => (bar.region ? REGION_COLOR[bar.region] : WAR_COLOR);

/**
 * A bar that opens its page when tapped: never narrower than MIN_BAR_WIDTH,
 * so a one-year war still shows, and its tap target the whole row tall and
 * at least BAR_HIT_WIDTH wide.
 */
function BarRow({ bar, y, height, xScale }: { bar: TimelineBar; y: number; height: number; xScale: ScaleLinear<number, number> }) {
  const x0 = xScale(bar.period.earliestStart);
  const x1 = xScale(bar.period.latestEnd);
  const hit = atLeast(x0, x1, BAR_HIT_WIDTH);
  const visible = atLeast(x0, x1, MIN_BAR_WIDTH);
  const barHeight = height - BAR_INSET * 2;
  return (
    <Link href={barHref(bar)} aria-label={bar.name} className="outline-none focus-visible:[&>rect:first-of-type]:fill-ring/30">
      <title>{bar.name}</title>
      <rect x={hit.x} y={y} width={hit.width} height={height} fill="transparent" />
      <g transform={`translate(0, ${y + BAR_INSET})`} pointerEvents="none">
        {visible.width > x1 - x0 ? (
          <rect x={visible.x} width={visible.width} height={barHeight} fill={barColor(bar)} rx={2} />
        ) : (
          <PeriodBar
            period={bar.period}
            phases={bar.phases}
            xScale={xScale}
            height={barHeight}
            color={barColor(bar)}
            fadeId={`tl-fade-${bar.region ?? "war"}`}
          />
        )}
      </g>
    </Link>
  );
}

/**
 * One country's civilisations and wars on one year axis, opening zoomed to
 * fit. The year line starts at the first war, where overlaps begin to show,
 * or at the first civilisation; ?year= overrides it.
 */
export function CountryTimeline({ bars }: { bars: TimelineBar[] }) {
  const t = useTranslations("country");
  const domain = useMemo(() => padDomain(computeYearDomain(bars.map((b) => b.period))), [bars]);
  const { rows, totalHeight } = useMemo(() => layoutCountryRows(bars), [bars]);
  const start = (bars.find((b) => b.kind === "war") ?? bars[0]).period.latestStart;
  const [year, setYear] = useYearParam(domain, start, null);

  return (
    <div className="flex flex-col gap-3">
      <TimelineChart
        fit
        rows={rows}
        totalHeight={totalHeight}
        domain={domain}
        year={year}
        onYear={setYear}
        label={(row, top) =>
          row.kind === "header" ? (
            <RowHeader y={top} height={row.height}>
              {t(row.group)}
            </RowHeader>
          ) : (
            <RowLabel href={barHref(row.item)} name={row.item.name} y={top} height={row.height} />
          )
        }
        bars={(row, xScale) => <BarRow bar={row.item} y={row.y} height={row.height} xScale={xScale} />}
      />
      <YearPanel
        year={year}
        entries={activeBars(bars, year).map(({ bar, certain }) => ({
          id: bar.id,
          name: bar.name,
          href: barHref(bar),
          span: { start: bar.period.latestStart, end: bar.asOf ? null : bar.period.earliestEnd, asOf: bar.asOf },
          certain,
          color: barColor(bar),
        }))}
      />
    </div>
  );
}
