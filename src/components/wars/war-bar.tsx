import { scaleLinear } from "d3-scale";
import { useLocale } from "next-intl";
import { DisputedBadge } from "@/components/culture/disputed-badge";
import { YearRangeText } from "@/components/settings/year-text";
import { FadeGradients, PeriodBar } from "@/components/timeline/timeline-row";
import { localize } from "@/lib/data/localize";
import type { War } from "@/lib/data/war-schema";
import { warOuter } from "@/lib/data/wars";

const WIDTH = 1000;
const HEIGHT = 12;

/** The war's dates as one bar, fading across uncertain edges, cut into its phases the way Rome's are. */
export function WarBar({ war }: { war: Pick<War, "period" | "ongoing" | "phases"> }) {
  const locale = useLocale();
  const [from, to] = warOuter(war);
  const dated = war.period ?? war.ongoing;
  if (!dated) throw new Error("a war needs a period or ongoing");
  // Stored years are whole calendar years, end included: draw each span to
  // the start of the year after, or a war or phase inside one year (1519–1519)
  // would have no width. An ongoing war's bar runs solid through its asOf year.
  const period = {
    ...dated,
    earliestEnd: (war.period?.earliestEnd ?? to) + 1,
    latestEnd: (war.period?.latestEnd ?? to) + 1,
  };
  const phases = war.phases.map((p) => ({ ...p, end: p.end + 1 }));
  const xScale = scaleLinear().domain([from, to + 1]).range([0, WIDTH]);
  const note = dated.note && localize(dated.note, locale);

  return (
    <div className="flex flex-col gap-2">
      {period.disputed && (
        <div className="flex flex-wrap items-center gap-2">
          <DisputedBadge note={note} />
        </div>
      )}
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" className="h-3 w-full" aria-hidden>
        <defs>
          <FadeGradients id="war-fade" color="var(--primary)" />
        </defs>
        <PeriodBar period={period} phases={phases} xScale={xScale} height={HEIGHT} color="var(--primary)" fadeId="war-fade" />
      </svg>
      {war.phases.length > 0 && (
        <ol className="flex flex-col gap-1 text-sm">
          {war.phases.map((phase, i) => (
            <li key={phase.id} className="flex flex-wrap items-baseline gap-x-2">
              <span className="text-muted-foreground tabular-nums">{i + 1}.</span>
              <span className="font-medium">{localize(phase.name, locale)}</span>
              <span className="text-muted-foreground">
                <YearRangeText start={phase.start} end={phase.end} />
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
