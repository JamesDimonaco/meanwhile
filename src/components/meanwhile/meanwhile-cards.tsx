import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/locales";
import { localize } from "@/lib/data/localize";
import type { MeanwhileCandidate, MeanwhileCard } from "@/lib/data/queries";
import type { Region } from "@/lib/data/schema";
import { YearRangeText } from "@/components/settings/year-text";
import { HeartlandFlags } from "@/components/identity/heartland-flags";
import { RegionDot } from "@/components/identity/region-dot";
import { MeanwhileFilter, type FilterableCard } from "./meanwhile-filter";

/**
 * 4–6 cards for other civilisations active at the same time. Tap a card to
 * re-anchor. Every candidate is rendered here; MeanwhileFilter picks which to
 * show for the regions this device chose, and badges the ones it shows.
 */
export async function MeanwhileCards({
  candidates,
  cards,
  anchorRegion,
  regions,
  locale,
}: {
  candidates: MeanwhileCandidate[];
  cards: Record<string, MeanwhileCard>;
  anchorRegion: Region;
  regions: Region[];
  locale: Locale;
}) {
  const t = await getTranslations({ locale, namespace: "common" });
  const tMeanwhile = await getTranslations({ locale, namespace: "meanwhile" });
  const tContext = await getTranslations({ locale, namespace: "context" });

  const filterable = Object.fromEntries(
    Object.values(cards).map(({ culture, fact }): [string, FilterableCard] => {
      const disputed = String(culture.period.disputed);
      return [
        culture.id,
        {
          period: culture.period,
          label: tMeanwhile("reanchor", { name: localize(culture.name, locale) }),
          badges: {
            oldest: tContext("badge", { kind: "oldest", disputed }),
            longest: tContext("badge", { kind: "longest", disputed }),
          },
          head: (
            <>
              <span className="flex flex-wrap items-center gap-x-1.5">
                <span className="font-medium text-foreground">{localize(culture.name, locale)}</span>
                {culture.nativeName && (
                  <span lang={culture.nativeName.lang} className="text-muted-foreground">
                    {culture.nativeName.text}
                  </span>
                )}
                <HeartlandFlags cultureId={culture.id} />
              </span>
              <span className="text-sm text-muted-foreground">
                <RegionDot region={culture.region} /> {t(`regions.${culture.region}`)}
                {" · "}
                <YearRangeText start={culture.period.latestStart} end={culture.period.earliestEnd} />
              </span>
            </>
          ),
          fact: fact && <p className="mt-1 text-sm text-foreground/90">{localize(fact.text, locale)}</p>,
        },
      ];
    }),
  );

  return <MeanwhileFilter candidates={candidates} anchorRegion={anchorRegion} regions={regions} cards={filterable} />;
}
