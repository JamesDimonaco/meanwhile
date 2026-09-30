"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import type { Region } from "@/lib/data/schema";
import { RegionDot } from "@/components/identity/region-dot";
import { cn } from "@/lib/utils";
import { toggleRegion } from "./region-filter";
import { saveRegionFilter, useRegionFilter } from "./use-region-filter";

function Chip({ pressed, onClick, children }: { pressed: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium whitespace-nowrap transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        pressed
          ? "border-foreground bg-foreground text-background"
          : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {children}
    </button>
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
    <div role="group" aria-label={t("regionFilter")} className="flex flex-wrap gap-1.5">
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
    </div>
  );
}

/** Chips wired to the choice this device remembers. */
export function StoredRegionChips({ available }: { available: readonly Region[] }) {
  return <RegionChips available={available} selection={useRegionFilter(available)} onChange={saveRegionFilter} />;
}

/** "Nothing in the regions you picked", with a way back to All. */
export function NoneInRegions({ message }: { message: "noneInRegions" | "hiddenByFilter" }) {
  const t = useTranslations("common");
  return (
    <p className="px-1 text-sm text-muted-foreground">
      {t(message)}{" "}
      <button
        type="button"
        onClick={() => saveRegionFilter([])}
        className="font-medium text-foreground underline underline-offset-2"
      >
        {t("showAllRegions")}
      </button>
    </p>
  );
}
