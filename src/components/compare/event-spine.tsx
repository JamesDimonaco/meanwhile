"use client";

import { Fragment, type CSSProperties } from "react";
import { useLocale, useTranslations } from "next-intl";
import { DisputedBadge } from "@/components/culture/disputed-badge";
import { YearRangeText } from "@/components/settings/year-text";
import { localize } from "@/lib/data/localize";
import type { CompareCulture, CompareEvent } from "./compare-data";
import { PAIR_WINDOW, buildSpine, isPaired, type Overlap } from "./compare-math";
import { SectionHeading } from "@/components/ui/page";
import { SLOTS } from "./slots";

/** A jump this long between neighbouring rows gets a "N years later" marker on the spine. */
const GAP_LABEL_YEARS = 100;
/** Half the 1.25rem spine column, when the spine runs down the start edge. */
const SPINE_CENTER = "0.625rem";

/**
 * Time runs down the screen: a year spine, each culture's events in its own
 * column at their place in time, and events close in time across columns
 * side by side on one row, linked as "meanwhile". Two cultures: A | spine | B.
 * Three: the spine moves to the start edge.
 */
export function EventSpine({
  cultures,
  overlap,
  onSelect,
}: {
  cultures: CompareCulture[];
  overlap: Overlap;
  onSelect: (side: number, event: CompareEvent) => void;
}) {
  const t = useTranslations("compare");
  const locale = useLocale();
  const rows = buildSpine(cultures.map((c) => c.events));
  const two = cultures.length === 2;
  const grid: CSSProperties = {
    display: "grid",
    gridTemplateColumns: two ? "minmax(0,1fr) 1.25rem minmax(0,1fr)" : `1.25rem repeat(${cultures.length}, minmax(0,1fr))`,
    columnGap: "0.5rem",
  };
  const spineCol = two ? 2 : 1;
  const sideCol = (side: number) => (two ? (side === 0 ? 1 : 3) : side + 2);
  const both =
    overlap.kind === "overlap" || overlap.kind === "uncertain"
      ? ([overlap.start, overlap.end] as const)
      : overlap.kind === "touching"
        ? ([overlap.year, overlap.year] as const)
        : null;

  return (
    <section className="flex flex-col gap-3">
      <SectionHeading>{t("yearByYear")}</SectionHeading>
      <p className="text-sm text-muted-foreground">{t("tapHint", { years: PAIR_WINDOW })}</p>

      <div style={grid} className="sticky top-0 z-10 -mx-4 bg-background/95 px-4 py-2 backdrop-blur">
        {cultures.map((c, side) => (
          <p
            key={c.id}
            style={{ gridColumn: sideCol(side) }}
            className={`truncate text-sm font-semibold ${SLOTS[side].text} ${two && side === 0 ? "text-end" : ""}`}
          >
            {localize(c.name, locale)}
          </p>
        ))}
      </div>

      <ol className="flex flex-col">
        {rows.map((row, i) => {
          const gap = i > 0 ? row.year - rows[i - 1].year : 0;
          const paired = isPaired(row);
          const inBoth = both !== null && row.year >= both[0] && row.year <= both[1];
          const filled = row.cells.flatMap((cell, side) => (cell ? [sideCol(side)] : []));
          return (
            <Fragment key={row.cells.map((c) => c?.id ?? "").join("|")}>
              {gap >= GAP_LABEL_YEARS && (
                <li aria-hidden style={grid} className="py-1">
                  <span className="col-span-full flex justify-center">
                    <span className="rounded-full border border-dashed border-border bg-background px-2 py-0.5 text-xs text-muted-foreground">
                      {t("yearsLater", { count: gap })}
                    </span>
                  </span>
                </li>
              )}
              <li style={grid} className={`relative ${paired ? "pt-6 pb-1.5" : "py-1.5"}`}>
                <span
                  aria-hidden
                  style={{ insetInlineStart: two ? "50%" : SPINE_CENTER }}
                  className={`absolute inset-y-0 -translate-x-1/2 ${inBoth ? "w-1 bg-foreground/35" : "w-px bg-border"}`}
                />
                <span aria-hidden style={{ gridColumn: spineCol, gridRow: 1 }} className="flex justify-center">
                  <span
                    className={`relative mt-3 size-2.5 rounded-full ring-2 ring-background ${paired ? "bg-foreground" : SLOTS[row.cells.findIndex(Boolean)].bg}`}
                  />
                </span>
                {paired && (
                  <span
                    style={{ gridColumn: `${Math.min(...filled)} / ${Math.max(...filled) + 1}`, gridRow: 1 }}
                    className="pointer-events-none relative"
                  >
                    <span aria-hidden className="absolute inset-x-3 top-[17px] border-t-2 border-dotted border-foreground/50" />
                    <span className="absolute inset-x-0 -top-5 flex justify-center">
                      <span className="rounded-full bg-foreground px-2 py-px text-xs font-medium text-background">
                        {t("meanwhile")}
                      </span>
                    </span>
                  </span>
                )}
                {row.cells.map((event, side) =>
                  event ? (
                    <EventCard
                      key={`${side}:${event.id}`}
                      event={event}
                      side={side}
                      column={sideCol(side)}
                      towardSpine={two ? (side === 0 ? "end" : "start") : "start"}
                      onSelect={() => onSelect(side, event)}
                    />
                  ) : null,
                )}
              </li>
            </Fragment>
          );
        })}
      </ol>
    </section>
  );
}

function EventCard({
  event,
  side,
  column,
  towardSpine,
  onSelect,
}: {
  event: CompareEvent;
  side: number;
  column: number;
  towardSpine: "start" | "end";
  onSelect: () => void;
}) {
  const locale = useLocale();
  return (
    <div
      style={{ gridColumn: column, gridRow: 1 }}
      // 12px padding, not the 16px of other cards: two of these share a phone's width with the spine between them.
      className={`relative z-[1] flex flex-col gap-1 self-start rounded-xl border border-border bg-card p-3 transition-colors hover:bg-muted has-[button:focus-visible]:ring-3 has-[button:focus-visible]:ring-ring/50 ${towardSpine === "end" ? SLOTS[side].edgeEnd : SLOTS[side].edgeStart}`}
    >
      {/* The date is text, and the title's button covers the whole card (after:inset-0). */}
      <div className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
        <YearRangeText start={event.start} end={event.end ?? event.start} plain />
        {/* No note here: tapping the card opens it, and the note shows inside. */}
        {event.disputed && <DisputedBadge />}
      </div>
      <button
        type="button"
        onClick={onSelect}
        className="text-start text-sm leading-snug font-semibold after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none"
      >
        {localize(event.title, locale)}
      </button>
    </div>
  );
}
