import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { CountryItemCard } from "@/components/country/country-item-card";
import { CountryTimeline } from "@/components/country/country-timeline";
import { CountryFlag } from "@/components/identity/heartland-flags";
import { toTimelineBar } from "@/components/timeline/timeline-layout";
import { isLocale, LOCALES, type Locale } from "@/i18n/locales";
import { Link } from "@/i18n/navigation";
import { pageLocale } from "@/i18n/page-locale";
import { countryCodes, countryItems, itemId, openingView, overlapping, type CountryItem } from "@/lib/data/country";
import { loadCultures, loadHeartland, loadWars } from "@/lib/data/load";
import { localize } from "@/lib/data/localize";
import { countryName } from "@/lib/data/wars";
import { openGraph, pageAlternates } from "@/lib/seo";

export const dynamic = "force-static";
export const dynamicParams = false;

const hasPage = (code: string, locale: Locale) => countryCodes(loadHeartland(), loadWars(locale)).includes(code.toUpperCase());
const pageItems = (code: string, locale: Locale) => countryItems(code.toUpperCase(), loadCultures(), loadHeartland(), loadWars(locale));
/** How many civilisations and wars a page lists: its title, description and intro name only those. */
function counts(items: readonly CountryItem[]) {
  const cultures = items.filter((i) => i.kind === "culture").length;
  return { cultures, wars: items.length - cultures };
}

/** A country has a page in a language when a civilisation's heartland or a war shown in it lists the country. */
export function generateStaticParams({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) return [];
  return countryCodes(loadHeartland(), loadWars(params.locale)).map((code) => ({ code: code.toLowerCase() }));
}

export async function generateMetadata({ params }: PageProps<"/[locale]/country/[code]">): Promise<Metadata> {
  const locale = await pageLocale(params);
  const { code } = await params;
  const t = await getTranslations({ locale, namespace: "country" });
  const country = countryName(code.toUpperCase(), locale);
  const items = pageItems(code, locale);
  const listed = counts(items);
  const shownIn = LOCALES.filter((l) => hasPage(code, l));
  const appName = (await getTranslations({ locale, namespace: "common" }))("appName");
  // A one-item page's description names its item rather than a generic sentence.
  const name = items[0].kind === "culture" ? localize(items[0].culture.name, locale) : localize(items[0].war.name, locale);
  return {
    // Without the layout's " · <app name>" suffix: it pushed titles past what search results show.
    title: { absolute: t("title", { country, ...listed }) },
    description: t("metaDescription", { country, ...listed, name }),
    alternates: pageAlternates(locale, `country/${code}`, shownIn),
    // The default share image; the layout's openGraph would list every locale.
    openGraph: openGraph(locale, appName, { path: "", alt: appName }, shownIn),
  };
}

/** One country: its civilisations and wars on one timeline, then as a list, oldest first, with what overlapped. */
export default async function CountryPage({ params }: PageProps<"/[locale]/country/[code]">) {
  const locale = await pageLocale(params);
  const { code } = await params;
  if (!hasPage(code, locale)) notFound();
  const t = await getTranslations("country");
  const tWars = await getTranslations("wars");
  const upper = code.toUpperCase();
  const country = countryName(upper, locale);
  const items = pageItems(code, locale);
  const overlaps = overlapping(items);
  const cultureNames = Object.fromEntries(loadCultures().map((c) => [c.id, localize(c.name, locale)]));
  const listed = counts(items);

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-6 pt-4">
      <header className="flex flex-col gap-2">
        <Link href="/wars" className="self-start text-sm text-muted-foreground underline-offset-2 hover:underline">
          {tWars("allCountries")}
        </Link>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <CountryFlag code={upper} />
          {country}
        </h1>
        <p className="font-medium">{t("summary", listed)}</p>
        <p className="text-sm text-muted-foreground">{t("intro", { country, ...listed })}</p>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold tracking-tight">{t("timeline")}</h2>
        <CountryTimeline bars={items.map((item) => toTimelineBar(item, locale))} opening={openingView(items)} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold tracking-tight">{t("list")}</h2>
        <ol className="flex flex-col gap-3">
          {items.map((item) => (
            <li key={itemId(item)}>
              <CountryItemCard item={item} overlaps={overlaps.get(itemId(item)) ?? []} cultureNames={cultureNames} country={upper} />
            </li>
          ))}
        </ol>
      </section>
    </section>
  );
}
