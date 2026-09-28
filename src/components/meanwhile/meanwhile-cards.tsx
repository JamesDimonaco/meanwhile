import { getTranslations } from "next-intl/server";
import { Columns2 } from "lucide-react";
import { compareHref } from "@/components/compare/compare-href";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/locales";
import { localize } from "@/lib/data/localize";
import type { CultureRef, MeanwhileCard } from "@/lib/data/queries";
import { YearRangeText } from "@/components/settings/year-text";

/**
 * 4–6 cards for other civilisations active at the same time. Tap a card to
 * re-anchor; the small corner link compares it with the anchor instead.
 */
export async function MeanwhileCards({
  anchor,
  cards,
  locale,
}: {
  anchor: Pick<CultureRef, "id" | "name">;
  cards: MeanwhileCard[];
  locale: Locale;
}) {
  const t = await getTranslations({ locale, namespace: "common" });
  const tMeanwhile = await getTranslations({ locale, namespace: "meanwhile" });
  const tCompare = await getTranslations({ locale, namespace: "compare" });

  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {cards.map(({ culture, fact }) => (
        <li key={culture.id} className="relative">
          <Link
            href={`/c/${culture.id}`}
            aria-label={tMeanwhile("reanchor", { name: localize(culture.name, locale) })}
            className="flex h-full flex-col gap-1.5 rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted"
          >
            <span className="flex flex-wrap items-baseline gap-x-1.5 pe-24">
              <span className="font-medium text-foreground">{localize(culture.name, locale)}</span>
              {culture.nativeName && (
                <span lang={culture.nativeName.lang} className="text-muted-foreground">
                  {culture.nativeName.text}
                </span>
              )}
            </span>
            <span className="text-sm text-muted-foreground">
              {t(`regions.${culture.region}`)}
              {" · "}
              <YearRangeText start={culture.period.latestStart} end={culture.period.earliestEnd} />
            </span>
            {fact && <p className="mt-1 text-sm text-foreground/90">{localize(fact.text, locale)}</p>}
          </Link>
          {/* A sibling of the card link, not inside it: links can't nest. */}
          <Link
            href={compareHref([anchor.id, culture.id])}
            aria-label={tCompare("compareCardLabel", {
              a: localize(anchor.name, locale),
              b: localize(culture.name, locale),
            })}
            className="absolute end-3 top-3 inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium after:absolute after:-inset-1.5 hover:bg-muted"
          >
            <Columns2 aria-hidden className="size-3.5" />
            {tCompare("compareCard")}
          </Link>
        </li>
      ))}
    </ul>
  );
}
