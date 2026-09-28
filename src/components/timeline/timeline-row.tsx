import { useLocale, useTranslations } from "next-intl";
import type { ScaleLinear } from "d3-scale";
import { localize } from "@/lib/data/localize";
import { Link } from "@/i18n/navigation";
import { defaultPeriod } from "@/lib/data/queries";
import type { Region } from "@/lib/data/schema";
import type { Period, Phase } from "@/lib/data/schema";
import type { TimelineCulture, TimelineEvent } from "./timeline-layout";
import { barSegments } from "./timeline-math";

// Region order fixes which shared gradient/colour a bar uses; see REGIONS in schema.ts.
export const REGION_COLOR: Record<Region, string> = {
  china: "var(--chart-1)",
  "south-america": "var(--chart-2)",
  mesoamerica: "var(--chart-3)",
  europe: "var(--chart-4)",
};

const BAR_INSET = 4;
/** Event dots are small to keep bars readable; the hit area is finger-sized. */
const MARKER_HIT_RADIUS = 11;

/** Frozen name column: region header text, positioned to match the scrollable chart's rows. */
export function RegionHeaderLabel({ region, y, height }: { region: Region; y: number; height: number }) {
  const t = useTranslations("common");
  return (
    <p
      className="absolute inset-x-0 flex items-center text-xs font-medium text-muted-foreground"
      style={{ top: y, height }}
    >
      {t(`regions.${region}`)}
    </p>
  );
}

/** Frozen name column: one culture's name, row-aligned with its bar, linking to its page. */
export function CultureLabel({ culture, y, height }: { culture: TimelineCulture; y: number; height: number }) {
  const locale = useLocale();
  const name = localize(culture.name, locale);
  return (
    <Link
      href={`/c/${culture.id}`}
      title={name}
      className="absolute inset-x-0 truncate text-xs hover:underline"
      style={{ top: y, height, lineHeight: `${height}px` }}
    >
      {name}
    </Link>
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
  culture: TimelineCulture;
  y: number;
  height: number;
  xScale: ScaleLinear<number, number>;
  selectedEventId: string | null;
  onSelectEvent: (culture: TimelineCulture, event: TimelineEvent) => void;
}) {
  const locale = useLocale();
  const barTop = y + BAR_INSET;
  const barHeight = height - BAR_INSET * 2;
  const cy = y + height / 2;

  return (
    <g>
      <g transform={`translate(0, ${barTop})`} pointerEvents="none">
        <PeriodBar
          period={defaultPeriod(culture)}
          phases={culture.phases}
          xScale={xScale}
          height={barHeight}
          color={REGION_COLOR[culture.region]}
          fadeId={`tl-fade-${culture.region}`}
        />
      </g>
      {culture.events.map((event) => (
        <g key={event.id} className="cursor-pointer" onClick={() => onSelectEvent(culture, event)}>
          <title>{localize(event.title, locale)}</title>
          <circle cx={xScale(event.start)} cy={cy} r={MARKER_HIT_RADIUS} fill="transparent" />
          <circle
            cx={xScale(event.start)}
            cy={cy}
            r={selectedEventId === event.id ? 5 : 3.5}
            fill={selectedEventId === event.id ? "var(--primary)" : "var(--foreground)"}
            stroke="var(--background)"
            strokeWidth={1}
          />
        </g>
      ))}
    </g>
  );
}

/**
 * One culture's bar, drawn from y = 0: fades across the fuzzy edges, phase
 * segments (Rome) or a solid middle, and a dashed outline when the dates are
 * disputed. Needs <FadeGradients id={fadeId}> in the same SVG. Shared with
 * the compare screen.
 */
export function PeriodBar({
  period,
  phases,
  xScale,
  height,
  color,
  fadeId,
}: {
  period: Pick<Period, "earliestStart" | "latestStart" | "earliestEnd" | "latestEnd" | "disputed">;
  phases: readonly Pick<Phase, "id" | "start" | "end">[];
  xScale: ScaleLinear<number, number>;
  height: number;
  color: string;
  fadeId: string;
}) {
  const segments = barSegments(period, phases);
  return (
    <>
      {segments.map((segment, i) => {
        const x = xScale(segment.start);
        // Phases (Rome) touch end to end: a hairline gap and alternating
        // shade keep them readable as segments of one bar.
        const gap = segment.kind === "phase" && i > 0 ? 1 : 0;
        const width = Math.max(0, xScale(segment.end) - x - gap);
        const fill =
          segment.kind === "fade-in"
            ? `url(#${fadeId}-in)`
            : segment.kind === "fade-out"
              ? `url(#${fadeId}-out)`
              : color;
        return (
          <rect
            key={`${segment.kind}-${segment.start}`}
            x={x + gap}
            y={0}
            width={width}
            height={height}
            fill={fill}
            fillOpacity={segment.kind === "phase" && i % 2 === 1 ? 0.7 : 1}
            rx={2}
          />
        );
      })}
      {period.disputed && (
        <rect
          x={xScale(period.earliestStart)}
          y={0}
          width={Math.max(0, xScale(period.latestEnd) - xScale(period.earliestStart))}
          height={height}
          fill="none"
          stroke="var(--destructive)"
          strokeDasharray="3 2"
          rx={2}
        />
      )}
    </>
  );
}

/** The horizontal fade gradients a PeriodBar's fuzzy edges use: `${id}-in` and `${id}-out`. */
export function FadeGradients({ id, color }: { id: string; color: string }) {
  return (
    <>
      <linearGradient id={`${id}-in`} x1="0" x2="1" y1="0" y2="0">
        <stop offset="0" stopColor={color} stopOpacity={0} />
        <stop offset="1" stopColor={color} stopOpacity={1} />
      </linearGradient>
      <linearGradient id={`${id}-out`} x1="0" x2="1" y1="0" y2="0">
        <stop offset="0" stopColor={color} stopOpacity={1} />
        <stop offset="1" stopColor={color} stopOpacity={0} />
      </linearGradient>
    </>
  );
}
