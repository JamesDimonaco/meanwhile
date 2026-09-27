import type { Metadata } from "next";
import { CultureEvents } from "@/components/culture/culture-events";
import { MeanwhileCards } from "@/components/meanwhile/meanwhile-cards";
import { YearRangeText } from "@/components/settings/year-text";
import { CultureStory } from "@/components/territory-map/culture-story";
import { pageLocale } from "@/i18n/page-locale";
import { hasTerritoryMap, loadCulture, loadCultures } from "@/lib/data/load";
import { localize } from "@/lib/data/localize";
import { defaultPeriod, eventWorld, meanwhile } from "@/lib/data/queries";

export const dynamicParams = false;

export function generateStaticParams() {
  return loadCultures().map((c) => ({ id: c.id }));
}

export async function generateMetadata({ params }: PageProps<"/[locale]/c/[id]">): Promise<Metadata> {
  const locale = await pageLocale(params);
  const { id } = await params;
  return { title: localize(loadCulture(id).name, locale) };
}

/**
 * The Meanwhile screen and culture detail in one page: the moment first
 * (anchor + cards), exploration below. Owned by ui-core.
 */
export default async function CulturePage({ params }: PageProps<"/[locale]/c/[id]">) {
  const locale = await pageLocale(params);
  const { id } = await params;
  const cultures = loadCultures();
  const culture = loadCulture(id);
  const period = defaultPeriod(culture);
  const world = eventWorld(culture, cultures);

  return (
    <article className="mx-auto flex max-w-xl flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold">
          {localize(culture.name, locale)}
          {culture.nativeName && <span lang={culture.nativeName.lang}> ({culture.nativeName.text})</span>}
        </h1>
        <YearRangeText start={period.latestStart} end={period.earliestEnd} />
      </header>
      <MeanwhileCards cards={meanwhile(culture, cultures)} />
      <p>{localize(culture.description, locale)}</p>
      {hasTerritoryMap(culture.id) ? (
        <CultureStory culture={culture} eventWorld={world} />
      ) : (
        <CultureEvents culture={culture} eventWorld={world} />
      )}
    </article>
  );
}
