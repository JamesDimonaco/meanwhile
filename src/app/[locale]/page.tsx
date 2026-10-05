import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { pageLocale } from "@/i18n/page-locale";
import { SearchBox } from "@/components/search/search-box";
import { SearchFromUrl } from "@/components/search/search-from-url";
import { ScanButton } from "@/components/scan/scan-button";
import { Link } from "@/i18n/navigation";
import { loadCultures, loadHeartland, loadPopular, loadWars } from "@/lib/data/load";
import { countryCodes } from "@/lib/data/country";
import { localize } from "@/lib/data/localize";
import { countrySearchEntries, toSearchEntry, warSearchEntries } from "@/components/search/search-index";
import { YearRangeText } from "@/components/settings/year-text";
import { RecordsStrip } from "@/components/context/records-strip";
import { defaultPeriod } from "@/lib/data/queries";
import { RECORD_KINDS, recordHolder } from "@/lib/data/records";
import { RegionFilteredList } from "@/components/filters/region-filtered-list";
import { regionsIn } from "@/components/filters/region-filter";
import { HeartlandFlags } from "@/components/identity/heartland-flags";
import { RegionDot } from "@/components/identity/region-dot";
import { DEFAULT_LOCALE } from "@/i18n/locales";
import { jsonLd, openGraph, pageAlternates, websiteJsonLd } from "@/lib/seo";

export async function generateMetadata({ params }: PageProps<"/[locale]">): Promise<Metadata> {
  const locale = await pageLocale(params);
  const t = await getTranslations({ locale, namespace: "home" });
  const appName = (await getTranslations({ locale, namespace: "common" }))("appName");
  const description = t("metaDescription");
  // The layout's openGraph doesn't reach this page: Next puts the segment's
  // own opengraph-image file (without alt text) in its place unless the page
  // names the image itself.
  return {
    // The layout's title template skips a page in its own segment, so the app name is added here.
    title: { absolute: `${t("metaTitle")} · ${appName}` },
    description,
    alternates: pageAlternates(locale, ""),
    openGraph: openGraph(locale, appName, { path: "", alt: appName }),
  };
}

/** Home: scan a placard or search, popular starting points underneath. Owned by ui-core. */
export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const locale = await pageLocale(params);
  const t = await getTranslations("home");
  const tCommon = await getTranslations("common");
  const cultures = loadCultures();
  const entries = cultures.map(toSearchEntry);
  const shownWars = loadWars(locale);
  const wars = warSearchEntries(shownWars, locale);
  const countries = countrySearchEntries(countryCodes(loadHeartland(), shownWars), locale);
  const popular = loadPopular().map(toSearchEntry);
  const dated = cultures.map((c) => ({ id: c.id, name: c.name, period: defaultPeriod(c) }));
  const records = RECORD_KINDS.map((kind) => ({ kind, holder: recordHolder(kind, dated) }));
  const regions = regionsIn(cultures);
  const appName = tCommon("appName");
  // A language that names the site its own way (zh 同时代) shows the English name too, so it matches the domain.
  const englishName = (await getTranslations({ locale: DEFAULT_LOCALE, namespace: "common" }))("appName");

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-8 pt-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(websiteJsonLd()) }} />
      <header className="flex flex-col gap-1 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">{appName}</h1>
        {appName !== englishName && (
          <p lang="en" className="text-sm text-muted-foreground">
            {englishName}
          </p>
        )}
        <p className="text-sm text-muted-foreground">{tCommon("tagline")}</p>
      </header>

      <ScanButton variant="home" />

      {/* ?q= comes from a scan with no match; the page itself is prerendered. */}
      <Suspense fallback={<SearchBox countries={countries} entries={entries} wars={wars} regions={regions} />}>
        <SearchFromUrl countries={countries} entries={entries} wars={wars} regions={regions} />
      </Suspense>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">{t("popular")}</h2>
        <RegionFilteredList
          available={regions}
          className="grid grid-cols-1 gap-2.5 sm:grid-cols-2"
          items={popular.map((c) => ({
            id: c.id,
            region: c.region,
            node: (
              <Link
                href={`/c/${c.id}`}
                className="flex min-w-0 flex-col gap-0.5 rounded-lg border border-border px-4 py-3 hover:bg-muted"
              >
                <span className="flex flex-wrap items-center gap-x-1.5">
                  <span className="font-medium">{localize(c.name, locale)}</span>
                  {c.nativeName && (
                    <span lang={c.nativeName.lang} className="text-muted-foreground">
                      {c.nativeName.text}
                    </span>
                  )}
                  <HeartlandFlags cultureId={c.id} />
                </span>
                <span className="text-sm text-muted-foreground">
                  <RegionDot region={c.region} /> {tCommon(`regions.${c.region}`)}
                  {" · "}
                  <YearRangeText start={c.period.latestStart} end={c.period.earliestEnd} />
                </span>
              </Link>
            ),
          }))}
        />
      </section>

      <RecordsStrip holders={records} locale={locale} />
    </div>
  );
}
