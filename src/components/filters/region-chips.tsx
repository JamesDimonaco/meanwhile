"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import type { Region } from "@/lib/data/schema";
import { RegionDot } from "@/components/identity/region-dot";
import { Button } from "@/components/ui/button";
import { EmptyState, FIELD_LABEL } from "@/components/ui/page";
import { cn } from "@/lib/utils";
import { toggleRegion } from "./region-filter";
import { saveRegionFilter, useRegionFilter } from "./use-region-filter";

/** A filter chip; RegionChips and the wars page's continent chips share its look. */
export function Chip({ pressed, onClick, children }: { pressed: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium whitespace-nowrap transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none pointer-coarse:h-11",
        pressed
          ? "border-foreground bg-foreground text-background"
          : "border-foreground/25 text-foreground hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}

/** A labelled row of filter chips: the one filter pattern, on every list. */
export function ChipGroup({ label, children }: { label: string; children: ReactNode }) {
  const id = useId();
  const row = useRef<HTMLDivElement>(null);
  const lastPressed = useRef("");
  // A saved choice can be a chip that starts off-screen on a phone: bring it into the row's view, so
  // it is plain that a filter is on. Only when the choice changes (typing in the search box re-renders
  // this too) and only when the chip is hidden, so a tap on a visible chip moves nothing.
  useEffect(() => {
    const el = row.current;
    if (!el) return;
    const chips = [...el.querySelectorAll<HTMLElement>("[aria-pressed]")];
    const signature = chips.map((chip) => chip.getAttribute("aria-pressed")).join();
    if (signature === lastPressed.current) return;
    lastPressed.current = signature;
    const pressed = chips.find((chip) => chip.getAttribute("aria-pressed") === "true");
    if (!pressed) return;
    const start = pressed.offsetLeft - el.offsetLeft;
    if (start < el.scrollLeft || start + pressed.offsetWidth > el.scrollLeft + el.clientWidth) el.scrollLeft = start - 16;
  });
  return (
    <div role="group" aria-labelledby={id} className="flex flex-col gap-2">
      <span id={id} className={FIELD_LABEL}>
        {label}
      </span>
      {/* Phones: one row that scrolls sideways to the screen's edges (the cut-off chip shows there is more),
          so nine regions cost one row, not four; the row fades out at the edge it scrolls from. Wider screens wrap. */}
      <div
        ref={row}
        className="flex gap-2 max-sm:-mx-4 max-sm:overflow-x-auto max-sm:py-1 max-sm:ps-4 max-sm:pe-14 max-sm:[mask-image:linear-gradient(to_right,black_calc(100%-3.5rem),transparent)] max-sm:[scrollbar-width:none] sm:flex-wrap max-sm:[&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>
    </div>
  );
}

/** Multi-select region chips. "All" is on when nothing is picked. */
export function RegionChips({
  available,
  selection,
  onChange,
}: {
  available: readonly Region[];
  selection: readonly Region[];
  onChange: (next: Region[]) => void;
}) {
  const t = useTranslations("common");
  return (
    <ChipGroup label={t("regionFilter")}>
      <Chip pressed={selection.length === 0} onClick={() => onChange([])}>
        {t("allRegions")}
      </Chip>
      {available.map((region) => (
        <Chip
          key={region}
          pressed={selection.includes(region)}
          onClick={() => onChange(toggleRegion(selection, region, available))}
        >
          <RegionDot region={region} />
          {t(`regions.${region}`)}
        </Chip>
      ))}
    </ChipGroup>
  );
}

/** Chips wired to the choice this device remembers. */
export function StoredRegionChips({ available }: { available: readonly Region[] }) {
  return <RegionChips available={available} selection={useRegionFilter(available)} onChange={saveRegionFilter} />;
}

/** "Nothing in the regions you picked", with a way back to All. */
export function NoneInRegions({
  message,
  onShowAll = () => saveRegionFilter([]),
}: {
  message: "noneInRegions" | "hiddenByFilter";
  onShowAll?: () => void;
}) {
  const t = useTranslations("common");
  return (
    <EmptyState
      title={t(message)}
      action={
        <Button type="button" variant="outline" size="sm" onClick={onShowAll}>
          {t("showAllRegions")}
        </Button>
      }
    />
  );
}
