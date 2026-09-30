import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { BeforeAfter } from "@/components/context/before-after";
import { Columns2 } from "lucide-react";
import { compareHref } from "@/components/compare/compare-href";
import { CultureEvents } from "@/components/culture/culture-events";
import { PeriodRange } from "@/components/culture/period-range";
import { MeanwhileCards } from "@/components/meanwhile/meanwhile-cards";
import { CultureStory } from "@/components/territory-map/culture-story";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { pageLocale } from "@/i18n/page-locale";
import { hasTerritoryMap, loadCulture, loadCultures, loadSuccession } from "@/lib/data/load";
import { isMachineTranslated, localize } from "@/lib/data/localize";
import { defaultPeriod, eventWorld, meanwhileCandidates, successionFor, toCultureRef } from "@/lib/data/queries";
import { regionsIn } from "@/components/filters/region-filter";
import { HeartlandFlags } from "@/components/identity/heartland-flags";
import { RegionDot } from "@/components/identity/region-dot";
import { recordsHeld } from "@/lib/data/records";
import { cultureDescription, cultureTitle } from "@/lib/data/culture-copy";
import { pageAlternates } from "@/lib/seo";

export const dynamicParams = false;

export function generateStaticParams() {
  return loadCultures().map((c) => ({ id: c.id }));
}

export async function generateMetadata({ params }: PageProps<"/[locale]/c/[id]">): Promise<Metadata> {
  const locale = await pageLocale(params);
  const { id } = await params;
  const culture = loadCulture(id);
  const title = cultureTitle(culture, locale);
  const description = cultureDescription(culture, locale);
  // No `openGraph` override: see src/app/[locale]/page.tsx for why.
  return { title, description, alternates: pageAlternates(locale, `c/${id}`) };
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
  const { candidates, cards } = meanwhileCandidates(culture, cultures);
  const t = await getTranslations({ locale, namespace: "meanwhile" });
  const tCulture = await getTranslations({ locale, namespace: "culture" });
  const tCommon = await getTranslations({ locale, namespace: "common" });
  const tContext = await getTranslations({ locale, namespace: "context" });
  const refs = new Map(cultures.map((c) => [c.id, toCultureRef(c)]));
  const refsOf = (ids: string[]) => ids.flatMap((i) => refs.get(i) ?? []);
  const beforeAfter = successionFor(id, loadSuccession()).map((g) => ({
    ...g,
    before: refsOf(g.before),
    after: refsOf(g.after),
  }));
  const records = recordsHeld(id, [...refs.values()]);
  const tCompare = await getTranslations({ locale, namespace: "compare" });

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
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <RegionDot region={culture.region} />
            {tCommon(`regions.${culture.region}`)}
          </span>
          <HeartlandFlags cultureId={culture.id} withLabel />
        </p>
        <PeriodRange period={period} locale={locale} />
        <BeforeAfter lines={beforeAfter} locale={locale} />
        {records.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {records.map((kind) => tContext("holds", { kind, disputed: String(period.disputed) })).join(" ")}
          </p>
        )}
        <Link
          href={compareHref([culture.id])}
          className={buttonVariants({ variant: "outline", className: "self-start" })}
        >
          <Columns2 aria-hidden />
          {tCompare("compareWith")}
        </Link>
        {isMachineTranslated(culture, locale) && (
          <p className="text-xs text-muted-foreground">{tCommon("machineTranslated")}</p>
        )}
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold tracking-tight">{t("heading")}</h2>
        <MeanwhileCards
          anchor={culture}
          candidates={candidates}
          cards={cards}
          anchorRegion={culture.region}
          regions={regionsIn(cultures)}
          locale={locale}
        />
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
