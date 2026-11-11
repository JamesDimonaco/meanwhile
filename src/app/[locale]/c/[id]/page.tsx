import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { BeforeAfter } from "@/components/context/before-after";
import { Columns2 } from "lucide-react";
import { BackLink } from "@/components/ui/back-link";
import { Disclosure, Page, PageTitle, Section, SectionHeading } from "@/components/ui/page";
import { compareHref } from "@/components/compare/compare-href";
import { CultureEvents } from "@/components/culture/culture-events";
import { PeriodRange } from "@/components/culture/period-range";
import { MeanwhileCards } from "@/components/meanwhile/meanwhile-cards";
import { CultureStory } from "@/components/territory-map/culture-story";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { pageLocale } from "@/i18n/page-locale";
import { hasTerritoryMap, loadCulture, loadCultures, loadSuccession, loadWars } from "@/lib/data/load";
import { isMachineTranslated, localize } from "@/lib/data/localize";
import { defaultPeriod, eventWorld, meanwhileCandidates, successionFor, toCultureRef } from "@/lib/data/queries";
import { regionsIn } from "@/components/filters/region-filter";
import { HeartlandLinks } from "@/components/identity/country-link";
import { RegionDot } from "@/components/identity/region-dot";
import { YearRangeText } from "@/components/settings/year-text";
import { recordsHeld } from "@/lib/data/records";
import { alsoAlive } from "@/lib/data/country";
import { cultureDescription, cultureMetaTitle, cultureTitle } from "@/lib/data/culture-copy";
import { openGraph, pageAlternates } from "@/lib/seo";
import { warsForCulture } from "@/lib/data/wars";
import { WarRow } from "@/components/wars/war-parts";

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
  const appName = (await getTranslations({ locale, namespace: "common" }))("appName");
  const tCulture = await getTranslations({ locale, namespace: "culture" });
  // Names the segment's opengraph-image itself, since Next's own URL for it
  // has no trailing slash.
  return {
    // Without the layout's " · <app name>" suffix: it pushed titles past what search results show.
    title: { absolute: cultureMetaTitle(culture, locale, (name, years) => tCulture("metaTitle", { name, years })) },
    description,
    alternates: pageAlternates(locale, `c/${id}`),
    openGraph: openGraph(locale, appName, { path: `c/${id}`, alt: title }),
  };
}

/**
 * The meanwhile cards and culture detail in one page: the moment first
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
  const alive = alsoAlive(culture, cultures);
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
  const tWars = await getTranslations({ locale, namespace: "wars" });
  const wars = warsForCulture(loadWars(locale), id);
  const cultureNames = Object.fromEntries(cultures.map((c) => [c.id, localize(c.name, locale)]));

  return (
    <Page as="article">
      <header className="flex flex-col gap-3">
        <BackLink href="/">{tCommon("nav.home")}</BackLink>
        <p className="text-sm text-muted-foreground">{t("anchorLabel")}</p>
        <PageTitle className="-mt-2 flex flex-wrap items-baseline gap-x-2">
          {localize(culture.name, locale)}
          {culture.nativeName && (
            <span lang={culture.nativeName.lang} className="text-lg font-normal text-muted-foreground">
              {culture.nativeName.text}
            </span>
          )}
        </PageTitle>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <RegionDot region={culture.region} />
            {tCommon(`regions.${culture.region}`)}
          </span>
          <HeartlandLinks cultureId={culture.id} />
        </p>
        <PeriodRange period={period} locale={locale} />
        {records.length > 0 && (
          <p className="text-sm text-muted-foreground">
            {records.map((kind) => tContext("holds", { kind, disputed: String(period.disputed), appName: tCommon("appName") })).join(" ")}
          </p>
        )}
        <Link
          prefetch={false}
          href={compareHref([culture.id])}
          className={buttonVariants({ variant: "outline", className: "self-start" })}
        >
          <Columns2 aria-hidden />
          {tCompare("compareWith")}
        </Link>
        {isMachineTranslated(culture, locale) && (
          <p className="text-sm text-muted-foreground">{tCommon("machineTranslated")}</p>
        )}
      </header>

      <section className="flex flex-col gap-3">
        <SectionHeading>{t("heading")}</SectionHeading>
        <MeanwhileCards
          anchor={culture}
          candidates={candidates}
          cards={cards}
          anchorRegion={culture.region}
          regions={regionsIn(cultures)}
          locale={locale}
        />
      </section>

      <Section title={tCulture("about")}>
        <p className="text-base leading-relaxed">{localize(culture.description, locale)}</p>
      </Section>

      {/* Below the moment (the cards), not above it: Rome's runs to five places. */}
      <BeforeAfter lines={beforeAfter} locale={locale} />

      {alive.length > 0 && (
        // Unfiltered: the region chips narrow the cards above, but this is the full list, rendered on the
        // server. Closed until asked for: Rome's runs past a hundred names, ahead of its key events.
        <Disclosure
          summary={
            <span className="flex flex-col gap-0.5">
              <span className="text-sm leading-snug font-semibold">{t("alsoAlive")}</span>
              <span className="text-sm text-muted-foreground">{t("alsoAliveCount", { count: alive.length })}</span>
            </span>
          }
        >
          <ul className="grid grid-cols-1 gap-x-2 p-2 text-sm sm:grid-cols-2">
            {alive.map((c) => (
              <li key={c.id}>
                <Link
                  prefetch={false}
                  href={`/c/${c.id}`}
                  className="flex min-h-11 flex-col justify-center rounded-lg px-2 py-1.5 hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  <span className="font-medium">{localize(c.name, locale)}</span>
                  <span className="text-muted-foreground">
                    <YearRangeText start={c.period.latestStart} end={c.period.earliestEnd} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Disclosure>
      )}

      <section className="flex flex-col gap-3">
        <SectionHeading>{tCulture("keyEvents")}</SectionHeading>
        {hasTerritoryMap(culture.id) ? (
          <CultureStory culture={culture} eventWorld={world} />
        ) : (
          <CultureEvents culture={culture} eventWorld={world} />
        )}
      </section>

      {wars.length > 0 && (
        <section className="flex flex-col gap-3">
          <SectionHeading>{tWars("cultureWars")}</SectionHeading>
          <ol className="flex flex-col gap-3">
            {wars.map((war) => (
              <li key={war.id}>
                <WarRow war={war} cultureNames={cultureNames} />
              </li>
            ))}
          </ol>
        </section>
      )}
    </Page>
  );
}
