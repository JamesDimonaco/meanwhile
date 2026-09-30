import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/locales";
import { localize } from "@/lib/data/localize";
import type { MeanwhileCard } from "@/lib/data/queries";
import { YearRangeText } from "@/components/settings/year-text";

/** 4–6 cards for other civilisations active at the same time. Tap a card to re-anchor. */
export async function MeanwhileCards({ cards, locale }: { cards: MeanwhileCard[]; locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "common" });
  const tMeanwhile = await getTranslations({ locale, namespace: "meanwhile" });

  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {cards.map(({ culture, fact }) => (
        <li key={culture.id}>
          <Link
            href={`/c/${culture.id}`}
            aria-label={tMeanwhile("reanchor", { name: localize(culture.name, locale) })}
            className="flex h-full min-w-0 flex-col gap-1.5 rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted"
          >
            <span className="flex items-baseline gap-1.5">
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
        </li>
      ))}
    </ul>
  );
}
