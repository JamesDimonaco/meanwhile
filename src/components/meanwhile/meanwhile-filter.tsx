"use client";

import { useMemo } from "react";
import { Columns2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { compareHref } from "@/components/compare/compare-href";
import { Link } from "@/i18n/navigation";
import { pickMeanwhile, type MeanwhileCandidate, type PeriodSpan } from "@/lib/data/queries";
import { cardBadges } from "@/lib/data/records";
import type { NativeName, Region } from "@/lib/data/schema";
import { NoneInRegions, StoredRegionChips } from "@/components/filters/region-chips";
import { includesRegion } from "@/components/filters/region-filter";
import { useRegionFilter } from "@/components/filters/use-region-filter";
import { HeartlandFlags } from "@/components/identity/heartland-flags";
import { RegionDot } from "@/components/identity/region-dot";
import { YearRangeText } from "@/components/settings/year-text";

/** What one card shows, already in the page's language. */
export type MeanwhileCardData = {
  id: string;
  region: Region;
  name: string;
  nativeName?: NativeName;
  period: PeriodSpan;
  fact: string | null;
};

/**
 * Which regions the meanwhile cards come from, and the cards picked for them.
 * Tap a card to re-anchor; the small corner link compares it with the anchor instead.
 */
export function MeanwhileFilter({
  anchor,
  candidates,
  anchorRegion,
  regions,
  cards,
}: {
  anchor: { id: string; name: string } | null;
  candidates: MeanwhileCandidate[];
  anchorRegion: Region | null;
  regions: Region[];
  cards: Record<string, MeanwhileCardData>;
}) {
  const t = useTranslations("common");
  const tMeanwhile = useTranslations("meanwhile");
  const tContext = useTranslations("context");
  const tCompare = useTranslations("compare");
  const selection = useRegionFilter(regions);
  const picked = useMemo(
    () => pickMeanwhile(candidates.filter((c) => includesRegion(selection, c.region)), anchorRegion),
    [candidates, selection, anchorRegion],
  );
  const badges = useMemo(() => cardBadges(picked.map((id) => cards[id])), [picked, cards]);

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
              <li key={id} className="relative">
                <Link
                  href={`/c/${id}`}
                  aria-label={tMeanwhile("reanchor", { name: card.name })}
                  className="flex h-full min-w-0 flex-col gap-1.5 rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted"
                >
                  <span className={`flex flex-wrap items-center gap-x-1.5 ${anchor ? "pe-24" : ""}`}>
                    <span className="font-medium text-foreground">{card.name}</span>
                    {card.nativeName && (
                      <span lang={card.nativeName.lang} className="text-muted-foreground">
                        {card.nativeName.text}
                      </span>
                    )}
                    <HeartlandFlags cultureId={id} />
                  </span>
                  <span className="text-sm text-muted-foreground">
                    <RegionDot region={card.region} /> {t(`regions.${card.region}`)}
                    {" · "}
                    <YearRangeText start={card.period.latestStart} end={card.period.earliestEnd} />
                  </span>
                  {badge && (
                    <span className="self-start rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      {tContext("badge", { kind: badge, disputed: String(card.period.disputed) })}
                    </span>
                  )}
                  {card.fact && <p className="mt-1 text-sm text-foreground/90">{card.fact}</p>}
                </Link>
                {/* A sibling of the card link, not inside it: links can't nest. */}
                {anchor && (
                  <Link
                    href={compareHref([anchor.id, id])}
                    aria-label={tCompare("compareCardLabel", { a: anchor.name, b: card.name })}
                    className="absolute end-3 top-3 inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium after:absolute after:-inset-1.5 hover:bg-muted"
                  >
                    <Columns2 aria-hidden className="size-3.5" />
                    {tCompare("compareCard")}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
