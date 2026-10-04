"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import type { ScaleLinear } from "d3-scale";
import { TimelineChart } from "@/components/timeline/timeline-chart";
import { layoutCountryRows, type TimelineBar } from "@/components/timeline/timeline-layout";
import { MIN_BAR_WIDTH, activeBars, atLeast, computeYearDomain, padDomain, snapToBar } from "@/components/timeline/timeline-math";
import { PeriodBar, REGION_COLOR, RowHeader, RowLabel, WAR_COLOR } from "@/components/timeline/timeline-row";
import { useYearParam } from "@/components/timeline/use-year-param";
import { YearPanel } from "@/components/timeline/year-panel";

const BAR_INSET = 8;

const barHref = (bar: TimelineBar) => (bar.kind === "culture" ? `/c/${bar.id}` : `/war/${bar.id}`);
const barColor = (bar: TimelineBar) => (bar.region ? REGION_COLOR[bar.region] : WAR_COLOR);

/**
 * A bar, never narrower than MIN_BAR_WIDTH so a one-year war still shows. Not
 * a link (its name in the frozen column is): a tap moves the year line, and
 * snapToBar puts it inside a short bar so the year panel lists it.
 */
function BarRow({ bar, y, height, xScale }: { bar: TimelineBar; y: number; height: number; xScale: ScaleLinear<number, number> }) {
  const x0 = xScale(bar.period.earliestStart);
  const x1 = xScale(bar.period.latestEnd);
  const visible = atLeast(x0, x1, MIN_BAR_WIDTH);
  const barHeight = height - BAR_INSET * 2;
  return (
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
  );
}

/**
 * One country's civilisations and wars on one year axis, opening on
 * `opening` (openingView in country.ts); ?year= overrides its year.
 */
export function CountryTimeline({ bars, opening }: { bars: TimelineBar[]; opening: { range: [number, number]; year: number } }) {
  const t = useTranslations("country");
  const domain = useMemo(() => padDomain(computeYearDomain(bars.map((b) => b.period)), opening.range), [bars, opening.range]);
  const fit = useMemo(() => padDomain(opening.range), [opening.range]);
  const { rows, totalHeight } = useMemo(() => layoutCountryRows(bars), [bars]);
  const [year, setYear] = useYearParam(domain, opening.year, null);

  return (
    <div className="flex flex-col gap-3">
      <TimelineChart
        fit={fit}
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
            <RowLabel href={barHref(row.item)} name={row.item.name} y={top} height={row.height} twoLines />
          )
        }
        bars={(row, xScale) => <BarRow bar={row.item} y={row.y} height={row.height} xScale={xScale} />}
        snap={(bar, year, xScale) => snapToBar(year, bar.period, xScale)}
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
