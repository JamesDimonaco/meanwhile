import { useLocale, useTranslations } from "next-intl";
import type { ScaleLinear } from "d3-scale";
import { localize } from "@/lib/data/localize";
import { defaultPeriod } from "@/lib/data/queries";
import type { Culture, CultureEvent, Region } from "@/lib/data/schema";
import { barSegments } from "./timeline-math";

// Region order fixes which shared gradient/colour a bar uses; see REGIONS in schema.ts.
export const REGION_COLOR: Record<Region, string> = {
  china: "var(--chart-1)",
  "south-america": "var(--chart-2)",
  mesoamerica: "var(--chart-3)",
  europe: "var(--chart-4)",
};

const BAR_INSET = 4;

/** Frozen name column: region header text, positioned to match the scrollable chart's rows. */
export function RegionHeaderLabel({ region, y, height }: { region: Region; y: number; height: number }) {
  const t = useTranslations("common");
  return (
    <text x={0} y={y + height / 2} dy="0.35em" className="fill-muted-foreground text-xs font-medium">
      {t(`regions.${region}`)}
    </text>
  );
}

/** Frozen name column: one culture's native/translated name, row-aligned with its bar. */
export function CultureLabel({ culture, y, height }: { culture: Culture; y: number; height: number }) {
  const locale = useLocale();
  return (
    <text x={0} y={y + height / 2} dy="0.35em" className="fill-foreground text-xs" lang={culture.nativeName?.lang}>
      {localize(culture.name, locale)}
    </text>
  );
}

export function CultureRow({
  culture,
  y,
  height,
  xScale,
  selectedEventId,
  onSelectEvent,
}: {
  culture: Culture;
  y: number;
  height: number;
  xScale: ScaleLinear<number, number>;
  selectedEventId: string | null;
  onSelectEvent: (culture: Culture, event: CultureEvent) => void;
}) {
  const locale = useLocale();
  const period = defaultPeriod(culture);
  const segments = barSegments(period, culture.phases);
  const color = REGION_COLOR[culture.region];
  const barTop = y + BAR_INSET;
  const barHeight = height - BAR_INSET * 2;
  const cy = y + height / 2;

  return (
    <g>
      <g transform={`translate(0, ${barTop})`} pointerEvents="none">
        {segments.map((segment) => {
          const x = xScale(segment.start);
          const width = Math.max(0, xScale(segment.end) - x);
          const fill =
            segment.kind === "fade-in"
              ? `url(#tl-fade-in-${culture.region})`
              : segment.kind === "fade-out"
                ? `url(#tl-fade-out-${culture.region})`
                : color;
          return (
            <rect
              key={`${segment.kind}-${segment.start}`}
              x={x}
              y={0}
              width={width}
              height={barHeight}
              fill={fill}
              rx={2}
            />
          );
        })}
        {period.disputed && (
          <rect
            x={xScale(period.earliestStart)}
            y={0}
            width={Math.max(0, xScale(period.latestEnd) - xScale(period.earliestStart))}
            height={barHeight}
            fill="none"
            stroke="var(--destructive)"
            strokeDasharray="3 2"
            rx={2}
          />
        )}
      </g>
      {culture.events.map((event) => (
        <circle
          key={event.id}
          cx={xScale(event.start)}
          cy={cy}
          r={selectedEventId === event.id ? 5 : 3.5}
          fill={selectedEventId === event.id ? "var(--primary)" : "var(--foreground)"}
          stroke="var(--background)"
          strokeWidth={1}
          className="cursor-pointer"
          onClick={() => onSelectEvent(culture, event)}
        >
          <title>{localize(event.title, locale)}</title>
        </circle>
      ))}
    </g>
  );
}
