"use client";

import { useId, type ReactNode } from "react";
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
        "inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium whitespace-nowrap transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none pointer-coarse:h-11",
        pressed
          ? "border-foreground bg-foreground text-background"
          : "border-border text-foreground hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}

/** A labelled row of filter chips: the one filter pattern, on every list. */
export function ChipGroup({ label, children }: { label: string; children: ReactNode }) {
  const id = useId();
  return (
    <div role="group" aria-labelledby={id} className="flex flex-col gap-2">
      <span id={id} className={FIELD_LABEL}>
        {label}
      </span>
      <div className="flex flex-wrap gap-2">{children}</div>
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
