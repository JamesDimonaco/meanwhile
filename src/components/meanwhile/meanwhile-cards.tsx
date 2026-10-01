import type { Locale } from "@/i18n/locales";
import { localize } from "@/lib/data/localize";
import type { CultureRef, MeanwhileCandidate, MeanwhileCard } from "@/lib/data/queries";
import type { Region } from "@/lib/data/schema";
import { MeanwhileFilter, type MeanwhileCardData } from "./meanwhile-filter";

/**
 * 4–6 cards for other civilisations active at the same time. Every candidate
 * goes to the client as plain data in this page's language, not as markup:
 * MeanwhileFilter picks which to show for the regions this device chose and
 * renders only those.
 */
export function MeanwhileCards({
  anchor,
  candidates,
  cards,
  anchorRegion,
  regions,
  locale,
}: {
  /** The culture the cards compare against; a war page has none, so its cards get no compare link. */
  anchor: Pick<CultureRef, "id" | "name"> | null;
  candidates: MeanwhileCandidate[];
  cards: Record<string, MeanwhileCard>;
  anchorRegion: Region | null;
  regions: Region[];
  locale: Locale;
}) {
  const data = Object.fromEntries(
    Object.values(cards).map(({ culture, fact }): [string, MeanwhileCardData] => [
      culture.id,
      {
        id: culture.id,
        region: culture.region,
        name: localize(culture.name, locale),
        nativeName: culture.nativeName,
        period: culture.period,
        fact: fact && localize(fact.text, locale),
      },
    ]),
  );

  return (
    <MeanwhileFilter
      anchor={anchor && { id: anchor.id, name: localize(anchor.name, locale) }}
      candidates={candidates}
      anchorRegion={anchorRegion}
      regions={regions}
      cards={data}
    />
  );
}
