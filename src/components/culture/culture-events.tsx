"use client";

import { ChevronDown, Crown, Flag, Lightbulb, Skull, Swords, type LucideIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { localize } from "@/lib/data/localize";
import type { CultureRef, EventWorld } from "@/lib/data/queries";
import type { Culture, CultureEvent, EventType, Source } from "@/lib/data/schema";
import { YearText } from "@/components/settings/year-text";
import { SectionHeading, TEXT_LINK } from "@/components/ui/page";
import { cn } from "@/lib/utils";
import { DisputedBadge } from "./disputed-badge";

export type CultureEventsProps = { culture: Culture; eventWorld: EventWorld };

const EVENT_ICONS: Record<EventType, LucideIcon> = {
  founding: Flag,
  ruler: Crown,
  invention: Lightbulb,
  conflict: Swords,
  collapse: Skull,
};

/** The key-events timeline: tapping an event shows what else was happening worldwide that year. */
export function CultureEvents({ culture, eventWorld }: CultureEventsProps) {
  const events = [...culture.events].sort((a, b) => a.start - b.start);
  return (
    <section className="flex flex-col gap-3">
      <ol className="flex flex-col gap-2">
        {events.map((event) => (
          <EventItem key={event.id} event={event} world={eventWorld[event.id] ?? []} />
        ))}
      </ol>
    </section>
  );
}

function EventItem({
  event,
  world,
}: {
  event: CultureEvent;
  world: EventWorld[string];
}) {
  const locale = useLocale();
  const Icon = EVENT_ICONS[event.type];

  return (
    <li>
      <details className="group rounded-xl border border-border bg-card">
        <summary className="flex cursor-pointer list-none items-start justify-between gap-3 rounded-xl p-4 hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none group-open:rounded-b-none [&::-webkit-details-marker]:hidden">
          <span className="flex items-start gap-2.5">
            <Icon aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <span className="flex flex-col gap-0.5">
              <span className="text-sm text-muted-foreground">
                <YearText year={event.start} plain />
                {event.end !== undefined && event.end !== event.start && (
                  <>
                    {" – "}
                    <YearText year={event.end} plain />
                  </>
                )}
              </span>
              <span className="flex flex-wrap items-center gap-1.5 font-medium">
                {localize(event.title, locale)}
                {/* No note here: tapping the row opens it, and the note shows inside. */}
                {event.disputed && <DisputedBadge />}
              </span>
            </span>
          </span>
          <ChevronDown
            aria-hidden
            className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
          />
        </summary>

        <div className="flex flex-col gap-4 border-t border-border p-4 text-sm">
          <EventDetail event={event} world={world} />
        </div>
      </details>
    </li>
  );
}

/** Who else was alive, just the fields EventDetail shows. */
export type EventDetailWorld = readonly {
  culture: Pick<CultureRef, "id" | "name" | "region">;
  certain: boolean;
}[];

/** An event's note, sources and what else was alive that year. Shared with the compare screen. */
export function EventDetail({ event, world }: { event: CultureEvent; world: EventDetailWorld }) {
  const locale = useLocale();
  const t = useTranslations("culture");
  const tCommon = useTranslations("common");

  return (
    <>
      {event.note && <p className="text-muted-foreground">{localize(event.note, locale)}</p>}

      <SourceList sources={event.sources} />

      <div>
        <SectionHeading as="h3" size="sub">
          {t.rich("alsoHappening", { year: () => <YearText year={event.start} /> })}
        </SectionHeading>
        {world.length === 0 ? (
          <p className="mt-1 text-muted-foreground">—</p>
        ) : (
          <ul className="mt-1.5 flex flex-col">
            {world.map(({ culture: ref, certain }) => (
              <li key={ref.id}>
                <Link prefetch={false} href={`/c/${ref.id}`} className="flex min-h-8 flex-wrap items-center gap-x-1.5 rounded-sm underline-offset-2 hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none pointer-coarse:min-h-11">
                  <span className="font-medium text-foreground underline underline-offset-2">{localize(ref.name, locale)}</span>
                  <span className="text-muted-foreground">
                    {tCommon(`regions.${ref.region}`)}
                    {!certain && ` (${t("uncertainOverlap")})`}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

/** A list of sources under its heading; `as` is the heading level that fits where it sits. */
export function SourceList({ sources, as = "h3" }: { sources: Source[]; as?: "h2" | "h3" | "h4" }) {
  const t = useTranslations("culture");
  return (
    <div>
      <SectionHeading as={as} size="sub">
        {t("sources")}
      </SectionHeading>
      <ul className="mt-1.5 flex flex-col gap-1.5">
        {sources.map((source, i) => (
          <li key={i} className="text-muted-foreground">
            {source.url ? (
              <a href={source.url} target="_blank" rel="noreferrer" className={cn(TEXT_LINK, "break-words")}>
                {source.citation}
              </a>
            ) : (
              source.citation
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
