"use client";

import { MapPin } from "lucide-react";
import dynamic from "next/dynamic";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { SourceList, type CultureEventsProps } from "@/components/culture/culture-events";
import { YearRangeText, YearText } from "@/components/settings/year-text";
import { Link } from "@/i18n/navigation";
import { localize } from "@/lib/data/localize";
import type { ActiveCulture } from "@/lib/data/queries";
import type { CultureEvent } from "@/lib/data/schema";
import { MapFrame } from "./map-frame";

/** How far below the sticky map an event's top must pass to take over the map. */
const LINE_BELOW_MAP = 48;

const TerritoryMap = dynamic(() => import("./territory-map").then((m) => m.TerritoryMap), {
  ssr: false,
  loading: () => <MapFrame />,
});

/**
 * The events timeline paired with a sticky territory map: as the events
 * scroll, the map redraws the borders for the event in view and pins its
 * place. Rendered instead of CultureEvents when hasTerritoryMap(id).
 */
export function CultureStory({ culture, eventWorld }: CultureEventsProps) {
  const events = [...culture.events].sort((a, b) => a.start - b.start);
  const [activeId, setActiveId] = useState(events[0].id);
  const [openId, setOpenId] = useState<string | null>(null);
  const [mapWanted, setMapWanted] = useState(false);
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

  // The event in view is the last one whose top has passed a line below the
  // sticky map. Driven by scroll, not IntersectionObserver, so a tapped event
  // opening its panel doesn't shift the next one across the line and steal the map.
  useEffect(() => {
    const items = list.current?.querySelectorAll<HTMLElement>("[data-event-id]");
    if (!items) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const line = (mapSlot.current?.getBoundingClientRect().bottom ?? 0) + LINE_BELOW_MAP;
      let id = items[0].dataset.eventId;
      for (const item of items) {
        if (item.getBoundingClientRect().top > line) break;
        id = item.dataset.eventId;
      }
      // At the foot of the page the last events can't scroll up to the line.
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

  // No scroll anchoring: when a caption changes the map's height, the browser
  // would shift the page to hold the list still, moving the line under the
  // events and flipping the map back and forth between two of them.
  return (
    <section className="flex flex-col gap-4 [overflow-anchor:none]">
      <div ref={mapSlot} className="sticky top-0 z-10 bg-background py-2">
        {mapWanted ? (
          <TerritoryMap
            cultureId={culture.id}
            region={culture.region}
            year={active.end ?? active.start}
            pin={active.place ?? null}
          />
        ) : (
          <MapFrame />
        )}
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
  event: CultureEvent;
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

  return (
    <li
      data-event-id={event.id}
      className={`rounded-lg border-s-4 bg-card transition-colors ${active ? "border-red-700 dark:border-red-400" : "border-transparent"}`}
    >
      {/* The date sits outside the toggle: it is its own button (the explainer). */}
      <p className="px-3 pt-3 text-sm text-muted-foreground">
        {event.end === undefined ? <YearText year={event.start} /> : <YearRangeText start={event.start} end={event.end} />}
      </p>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full flex-col items-start gap-0.5 px-3 pt-0.5 pb-3 text-start"
      >
        <span className="font-medium">{localize(event.title, locale)}</span>
        {event.place && (
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin aria-hidden className="size-3.5" />
            {localize(event.place.name, locale)}
          </span>
        )}
        {event.disputed && <span className="text-sm font-medium">{tc("disputed")}</span>}
        {event.note && <span className="text-sm text-muted-foreground">{localize(event.note, locale)}</span>}
      </button>
      {open && (
        <div id={panelId} className="flex flex-col gap-2 px-3 pb-3 text-sm">
          <p className="font-medium">{t.rich("elsewhere", { year: () => <YearText year={event.start} /> })}</p>
          {world.length > 0 ? (
            <ul className="flex flex-col gap-1">
              {world.map(({ culture, certain }) => (
                <li key={culture.id}>
                  <Link href={`/c/${culture.id}`} className="underline underline-offset-2">
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
          <SourceList sources={event.sources} />
          <Link
            href={{ pathname: "/timeline", query: { year: String(event.start) } }}
            className="underline underline-offset-2"
          >
            {t("onTimeline")}
          </Link>
        </div>
      )}
    </li>
  );
}
