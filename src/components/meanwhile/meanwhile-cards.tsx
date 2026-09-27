import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { localize } from "@/lib/data/localize";
import type { MeanwhileCard } from "@/lib/data/queries";
import { YearRangeText } from "@/components/settings/year-text";

/** Stub: ui-core owns the card design. Tapping a card re-anchors on that culture. */
export function MeanwhileCards({ cards }: { cards: MeanwhileCard[] }) {
  const locale = useLocale();
  return (
    <ul className="flex flex-col gap-3">
      {cards.map(({ culture, fact }) => (
        <li key={culture.id}>
          <Link href={`/c/${culture.id}`}>{localize(culture.name, locale)}</Link>{" "}
          <YearRangeText start={culture.period.latestStart} end={culture.period.earliestEnd} />
          {fact && <p>{localize(fact.text, locale)}</p>}
        </li>
      ))}
    </ul>
  );
}
