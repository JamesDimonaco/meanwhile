import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CultureEvents } from "@/components/culture/culture-events";
import { PeriodRange } from "@/components/culture/period-range";
import { MeanwhileCards } from "@/components/meanwhile/meanwhile-cards";
import { CultureStory } from "@/components/territory-map/culture-story";
import { pageLocale } from "@/i18n/page-locale";
import { hasTerritoryMap, loadCulture, loadCultures } from "@/lib/data/load";
import { isMachineTranslated, localize } from "@/lib/data/localize";
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
  const t = await getTranslations({ locale, namespace: "meanwhile" });
  const tCulture = await getTranslations({ locale, namespace: "culture" });
  const tCommon = await getTranslations({ locale, namespace: "common" });

  return (
    <article className="mx-auto flex w-full max-w-xl flex-col gap-8 pt-4">
      <header className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">{t("anchorLabel")}</p>
        <h1 className="flex flex-wrap items-baseline gap-2 text-2xl font-semibold tracking-tight">
          {localize(culture.name, locale)}
          {culture.nativeName && (
            <span lang={culture.nativeName.lang} className="text-lg font-normal text-muted-foreground">
              {culture.nativeName.text}
            </span>
          )}
        </h1>
        <PeriodRange period={period} locale={locale} />
        {isMachineTranslated(culture, locale) && (
          <p className="text-xs text-muted-foreground">{tCommon("machineTranslated")}</p>
        )}
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold tracking-tight">{t("heading")}</h2>
        <MeanwhileCards cards={meanwhile(culture, cultures)} locale={locale} />
      </section>

      <p className="text-base leading-relaxed">{localize(culture.description, locale)}</p>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold tracking-tight">{tCulture("keyEvents")}</h2>
        {hasTerritoryMap(culture.id) ? (
          <CultureStory culture={culture} eventWorld={world} />
        ) : (
          <CultureEvents culture={culture} eventWorld={world} />
        )}
      </section>
    </article>
  );
}
