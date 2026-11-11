import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CountryList } from "@/components/wars/country-list";
import { warSearchEntries } from "@/components/search/search-index";
import { pageLocale } from "@/i18n/page-locale";
import { CONTINENTS } from "@/lib/data/countries";
import { loadWars } from "@/lib/data/load";
import { countryIndex } from "@/lib/data/wars";
import { pageAlternates } from "@/lib/seo";
import { Page, PageIntro, PageTitle } from "@/components/ui/page";

export const dynamic = "force-static";

export async function generateMetadata({ params }: PageProps<"/[locale]/wars">): Promise<Metadata> {
  const locale = await pageLocale(params);
  const t = await getTranslations({ locale, namespace: "wars" });
  return { title: t("title"), description: t("metaDescription"), alternates: pageAlternates(locale, "wars") };
}

/** Countries with wars, a search over countries and wars, continent chips. */
export default async function WarsPage({ params }: PageProps<"/[locale]/wars">) {
  const locale = await pageLocale(params);
  const t = await getTranslations("wars");
  const wars = loadWars(locale);
  const countries = countryIndex(wars, locale);

  return (
    <Page as="section" className="gap-6">
      <header className="flex flex-col gap-2">
        <PageTitle>{t("title")}</PageTitle>
        <PageIntro>{t("intro")}</PageIntro>
      </header>
      <CountryList
        countries={countries}
        continents={CONTINENTS.filter((c) => countries.some((country) => country.continent === c))}
        wars={warSearchEntries(wars, locale)}
      />
    </Page>
  );
}
