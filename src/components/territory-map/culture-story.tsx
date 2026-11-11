"use client";

import { ChevronDown, MapPin } from "lucide-react";
import dynamic from "next/dynamic";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import { EVENT_ICONS, SourceList, type CultureEventsProps } from "@/components/culture/culture-events";
import { YearRangeText, YearText } from "@/components/settings/year-text";
import { Link } from "@/i18n/navigation";
import { localize } from "@/lib/data/localize";
import type { ActiveCulture } from "@/lib/data/queries";
import type { CultureEvent, EventType } from "@/lib/data/schema";
import { CARD_TITLE, DISCLOSURE_CHEVRON, Pill, SectionHeading, TEXT_LINK } from "@/components/ui/page";
import { cn } from "@/lib/utils";
import { MapFrame } from "./map-frame";

/** How far under the pinned map an event's top may slide before the next event takes over the map. */
const TOP_TOLERANCE = 16;
/** How much of an opened event must still show below the map for it to keep the map. */
const OPEN_KEEPS_MAP = 96;

const TerritoryMap = dynamic(() => import("./territory-map").then((m) => m.TerritoryMap), {
  ssr: false,
  loading: () => <MapFrame />,
});

/** What the story reads from an event: culture and war events both fit. */
export type StoryEvent = Pick<CultureEvent, "id" | "start" | "end" | "title" | "sources" | "disputed" | "note" | "place"> & {
  /** A culture's events say what kind they are (and get its icon); a war's don't. */
  type?: EventType;
};

/**
 * The events timeline paired with a sticky territory map: as the events
 * scroll, the map redraws the borders for the event in view and pins its
 * place. Rendered instead of CultureEvents when hasTerritoryMap(id).
 */
export function CultureStory({ culture, eventWorld }: CultureEventsProps) {
  return <EventStory events={culture.events} eventWorld={eventWorld} id={culture.id} hasBorders />;
}

type EventStoryProps = {
  events: readonly StoryEvent[];
  eventWorld: CultureEventsProps["eventWorld"];
  /** The culture or war id: names its land file, and its borders file when it has one. */
  id: string;
  /** false: pins on plain land, no borders. */
  hasBorders: boolean;
  /** Draw every event's place faintly and fit the frame to them (a war's battles). */
  allPins?: boolean;
  nameSelf?: boolean;
};

/** CultureStory's map and list for any dated, placed events: a culture's, or a war's. */
export function EventStory({ events: unsorted, eventWorld, id, hasBorders, allPins = false, nameSelf = false }: EventStoryProps) {
  const events = [...unsorted].sort((a, b) => a.start - b.start);
  const [activeId, setActiveId] = useState(events[0].id);
  const [openId, setOpenId] = useState<string | null>(null);
  const [mapWanted, setMapWanted] = useState(false);
  // For the scroll handler, which is set up once.
  const openRef = useRef<string | null>(null);
  useEffect(() => {
    openRef.current = openId;
  }, [openId]);
  const mapSlot = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLOListElement>(null);

  // Fetch the map code and data only once the story is close to the screen,
  // so it never competes with the meanwhile cards on a weak connection.
  useEffect(() => {
    const slot = mapSlot.current;
    if (!slot) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setMapWanted(true);
          observer.disconnect();
        }
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(slot);
    return () => observer.disconnect();
  }, []);

  // The event in view is the first one whose top is still clear of the pinned map, so the card the map
  // describes always shows its date and title; once a card's top slides under the map, the next takes over.
  // Driven by scroll, not IntersectionObserver, so a tapped event opening its panel doesn't hand the map on.
  useEffect(() => {
    const items = list.current?.querySelectorAll<HTMLElement>("[data-event-id]");
    if (!items) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const line = (mapSlot.current?.getBoundingClientRect().bottom ?? 0) - TOP_TOLERANCE;
      // Past the last card's top there is nothing below to take over: the last one keeps the map.
      let id = items[items.length - 1].dataset.eventId;
      for (const item of items) {
        if (item.getBoundingClientRect().top >= line) {
          id = item.dataset.eventId;
          break;
        }
      }
      // An opened event keeps the map for as long as a good part of it is still below the map: its panel can
      // be taller than the screen, and the reader is still in it after its top has gone.
      const opened = openRef.current && list.current?.querySelector<HTMLElement>(`[data-event-id="${CSS.escape(openRef.current)}"]`);
      if (opened) {
        const box = opened.getBoundingClientRect();
        if (box.top < line && box.bottom > line + OPEN_KEEPS_MAP) id = openRef.current ?? id;
      }
      // At the foot of the page the last events can't scroll up to the map.
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      if (atBottom) id = items[items.length - 1].dataset.eventId;
      if (id) setActiveId(id);
    };
    const onScroll = () => {
      frame ||= requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  const active = events.find((e) => e.id === activeId) ?? events[0];
  const pins = useMemo(() => unsorted.flatMap((e) => e.place ?? []), [unsorted]);

  // No scroll anchoring: when a caption changes the map's height, the browser
  // would shift the page to hold the list still, moving the line under the
  // events and flipping the map back and forth between two of them.
  return (
    <section className="flex flex-col gap-4 [overflow-anchor:none]">
      <div ref={mapSlot} className="sticky top-0 z-10 -mx-4 bg-background px-4 py-2">
        {/* Narrower than the column, so the pinned map leaves more than half the screen for the events under it. */}
        <div className="mx-auto max-w-[19rem] sm:max-w-md">
        {mapWanted ? (
          <TerritoryMap
            id={id}
            hasBorders={hasBorders}
            year={active.end ?? active.start}
            pin={active.place ?? null}
            pins={allPins ? pins : undefined}
            nameSelf={nameSelf}
          />
        ) : (
          <MapFrame />
        )}
        </div>
      </div>
      <ol ref={list} className="flex flex-col gap-2 pb-[30vh]">
        {events.map((event) => (
          <EventItem
            key={event.id}
            event={event}
            world={eventWorld[event.id] ?? []}
            active={event.id === active.id}
            open={event.id === openId}
            onToggle={() => {
              setActiveId(event.id);
              setOpenId(event.id === openId ? null : event.id);
            }}
          />
        ))}
      </ol>
    </section>
  );
}

type EventItemProps = {
  event: StoryEvent;
  world: ActiveCulture[];
  active: boolean;
  open: boolean;
  onToggle: () => void;
};

function EventItem({ event, world, active, open, onToggle }: EventItemProps) {
  const t = useTranslations("map");
  const tc = useTranslations("common");
  const locale = useLocale();
  const panelId = `event-${event.id}-world`;
  const Icon = event.type && EVENT_ICONS[event.type];
  return (
    // The same card as a culture page's plain event list (CultureEvents); the red edge marks the event the map shows.
    <li
      data-event-id={event.id}
      className={cn("rounded-xl border border-s-4 border-border bg-card transition-colors", active && "border-s-red-700")}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        className={cn(
          "flex w-full items-start justify-between gap-3 rounded-xl p-4 text-start hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
          open && "rounded-b-none",
        )}
      >
        <span className="flex min-w-0 items-start gap-2.5">
          {Icon && <Icon aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />}
          <span className="flex min-w-0 flex-col gap-1">
            <span className="flex flex-col gap-1">
              <span className="text-sm text-muted-foreground">
                {event.end === undefined ? <YearText year={event.start} plain /> : <YearRangeText start={event.start} end={event.end} plain />}
              </span>
              <span className={cn(CARD_TITLE, "flex flex-wrap items-center gap-1.5")}>
                {localize(event.title, locale)}
                {event.disputed && <Pill tone="warning">{tc("disputed")}</Pill>}
              </span>
            </span>
            {event.place && (
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin aria-hidden className="size-3.5 shrink-0" />
                {localize(event.place.name, locale)}
              </span>
            )}
            {event.note && <span className="text-sm text-muted-foreground">{localize(event.note, locale)}</span>}
          </span>
        </span>
        <ChevronDown aria-hidden className={cn(DISCLOSURE_CHEVRON, open && "rotate-180")} />
      </button>
      {open && (
        <div id={panelId} className="flex flex-col gap-4 border-t border-border p-4 text-sm">
          <div className="flex flex-col gap-1.5">
            <SectionHeading as="h3" size="sub">
              {t.rich("elsewhere", { year: () => <YearText year={event.start} plain /> })}
            </SectionHeading>
            {world.length > 0 ? (
              <ul className="flex flex-col gap-1.5">
                {world.map(({ culture, certain }) => (
                  <li key={culture.id}>
                    <Link prefetch={false} href={`/c/${culture.id}`} className={cn(TEXT_LINK, "font-medium")}>
                      {localize(culture.name, locale)}
                    </Link>
                    {culture.nativeName && <span lang={culture.nativeName.lang}> ({culture.nativeName.text})</span>}
                    <span className="text-muted-foreground">
                      {" "}
                      · {tc(`regions.${culture.region}`)}
                      {!certain && ` · ${t("fuzzyDates")}`}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">{t("nothingElsewhere")}</p>
            )}
          </div>
          <SourceList sources={event.sources} />
          <Link
            prefetch={false}
            href={{ pathname: "/timeline", query: { year: String(event.start) } }}
            className={cn(TEXT_LINK, "inline-flex min-h-9 items-center self-start font-medium pointer-coarse:min-h-11")}
          >
            {t("onTimeline")}
          </Link>
        </div>
      )}
    </li>
  );
}
