"use client";

import { useMemo, type ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { pickMeanwhile, type MeanwhileCandidate, type PeriodSpan } from "@/lib/data/queries";
import { cardBadges, type CardBadge } from "@/lib/data/records";
import type { Region } from "@/lib/data/schema";
import { NoneInRegions, StoredRegionChips } from "@/components/filters/region-chips";
import { includesRegion } from "@/components/filters/region-filter";
import { useRegionFilter } from "@/components/filters/use-region-filter";

/** One card, rendered on the server; the badge is added here because it depends on which cards are shown. */
export type FilterableCard = {
  period: PeriodSpan;
  label: string;
  badges: Record<CardBadge, string>;
  head: ReactNode;
  fact: ReactNode;
};

/** Which regions the meanwhile cards come from, and the cards picked for them. */
export function MeanwhileFilter({
  candidates,
  anchorRegion,
  regions,
  cards,
}: {
  candidates: MeanwhileCandidate[];
  anchorRegion: Region;
  regions: Region[];
  cards: Record<string, FilterableCard>;
}) {
  const selection = useRegionFilter(regions);
  const picked = useMemo(
    () => pickMeanwhile(candidates.filter((c) => includesRegion(selection, c.region)), anchorRegion),
    [candidates, selection, anchorRegion],
  );
  const badges = useMemo(() => cardBadges(picked.map((id) => ({ id, period: cards[id].period }))), [picked, cards]);

  return (
    <div className="flex flex-col gap-3">
      <StoredRegionChips available={regions} />
      {picked.length === 0 ? (
        <NoneInRegions message="noneInRegions" />
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {picked.map((id) => {
            const card = cards[id];
            const badge = badges[id];
            return (
              <li key={id}>
                <Link
                  href={`/c/${id}`}
                  aria-label={card.label}
                  className="flex h-full min-w-0 flex-col gap-1.5 rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted"
                >
                  {card.head}
                  {badge && (
                    <span className="self-start rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      {card.badges[badge]}
                    </span>
                  )}
                  {card.fact}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
