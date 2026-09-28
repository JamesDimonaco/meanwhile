"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { scaleLinear } from "d3-scale";
import { DisputedBadge } from "@/components/culture/disputed-badge";
import { YearRangeText, YearText } from "@/components/settings/year-text";
import { useSettings } from "@/components/settings/use-settings";
import { FadeGradients, PeriodBar } from "@/components/timeline/timeline-row";
import { axisTicks, computeYearDomain } from "@/components/timeline/timeline-math";
import { localize } from "@/lib/data/localize";
import { formatYear } from "@/lib/years";
import type { CompareCulture } from "./compare-data";
import type { Overlap } from "./compare-math";
import { SLOTS } from "./slots";

const BAR_HEIGHT = 12;
const ROW_GAP = 8;
const AXIS_HEIGHT = 18;
/** Roughly one axis label per this many pixels, wide enough for "公元前1000年". */
const TICK_SPACING = 90;
/** Keeps the earliest and latest edges off the chart's sides. */
const DOMAIN_PADDING = 0.03;

/** The one-sentence answer, then every culture's bar on one shared axis with the overlap shaded. */
export function OverlapChart({ cultures, overlap }: { cultures: CompareCulture[]; overlap: Overlap }) {
  const t = useTranslations("compare");
  const locale = useLocale();
  const { eraStyle } = useSettings();
  // useId output isn't a safe url(#…) fragment in every React version.
  const fadeId = `cmp-${useId().replace(/[^\w-]/g, "")}`;
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const [min, max] = computeYearDomain(cultures.map((c) => c.period));
  const pad = (max - min) * DOMAIN_PADDING;
  const domain: [number, number] = [min - pad, max + pad];
  const xScale = scaleLinear().domain(domain).range([0, width]);
  const barsHeight = cultures.length * (BAR_HEIGHT + ROW_GAP);
  const height = barsHeight + AXIS_HEIGHT;
  const ticks = axisTicks(domain, Math.max(2, Math.floor(width / TICK_SPACING)));
  const all = cultures.length > 2;

  const sentence = (() => {
    switch (overlap.kind) {
      case "overlap":
        return t.rich(all ? "overlapAll" : "overlap", {
          count: overlap.years,
          range: () => <YearRangeText start={overlap.start} end={overlap.end} />,
        });
      case "touching":
        return t.rich(all ? "touchingAll" : "touching", { year: () => <YearText year={overlap.year} /> });
      case "uncertain":
        return t.rich(all ? "uncertainAll" : "uncertain", {
          range: () => <YearRangeText start={overlap.start} end={overlap.end} />,
        });
      case "gap":
        return all ? t("gapAll") : t("gap", { count: overlap.years });
    }
  })();

  const band =
    overlap.kind === "overlap" || overlap.kind === "uncertain"
      ? { start: overlap.start, end: overlap.end }
      : overlap.kind === "touching"
        ? { start: overlap.year, end: overlap.year }
        : null;

  return (
    <section className="flex flex-col gap-3">
      <p className="text-lg leading-snug font-semibold">{sentence}</p>

      <ul className="flex flex-col gap-1 text-sm">
        {cultures.map((c, i) => (
          <li key={c.id} className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span aria-hidden className={`size-2.5 shrink-0 rounded-full ${SLOTS[i].bg}`} />
            <span className={`font-semibold ${SLOTS[i].text}`}>{localize(c.name, locale)}</span>
            <span className="text-muted-foreground">
              <YearRangeText start={c.period.latestStart} end={c.period.earliestEnd} />
            </span>
            {c.period.disputed && <DisputedBadge note={c.period.note && localize(c.period.note, locale)} />}
          </li>
        ))}
      </ul>

      <div ref={box} style={{ height }}>
        {width > 0 && (
          <svg width={width} height={height} className="block overflow-visible" aria-hidden>
            <defs>
              {cultures.map((c, i) => (
                <FadeGradients key={c.id} id={`${fadeId}-${i}`} color={SLOTS[i].color} />
              ))}
            </defs>
            {band && (
              <g>
                <rect
                  x={xScale(band.start)}
                  y={0}
                  width={Math.max(2, xScale(band.end) - xScale(band.start))}
                  height={barsHeight}
                  fill="var(--foreground)"
                  fillOpacity={overlap.kind === "uncertain" ? 0.05 : 0.1}
                />
                {[band.start, band.end].map((year, i) => (
                  <line
                    key={i}
                    x1={xScale(year)}
                    x2={xScale(year)}
                    y1={0}
                    y2={barsHeight}
                    stroke="var(--foreground)"
                    strokeOpacity={0.5}
                    strokeDasharray="2 2"
                  />
                ))}
              </g>
            )}
            {cultures.map((c, i) => (
              <g key={c.id} transform={`translate(0, ${i * (BAR_HEIGHT + ROW_GAP) + ROW_GAP / 2})`}>
                <PeriodBar
                  period={c.period}
                  phases={c.phases}
                  xScale={xScale}
                  height={BAR_HEIGHT}
                  color={SLOTS[i].color}
                  fadeId={`${fadeId}-${i}`}
                />
              </g>
            ))}
            <g className="fill-muted-foreground text-[10px]">
              {ticks.map((tick) => {
                const x = xScale(tick);
                const anchor = x < 30 ? "start" : x > width - 30 ? "end" : "middle";
                return (
                  <text key={tick} x={x} y={barsHeight + AXIS_HEIGHT / 2 + 2} dy="0.35em" textAnchor={anchor}>
                    {formatYear(tick, locale, eraStyle)}
                  </text>
                );
              })}
            </g>
          </svg>
        )}
      </div>
    </section>
  );
}
