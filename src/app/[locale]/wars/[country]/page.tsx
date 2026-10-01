import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { CountryFlag } from "@/components/identity/heartland-flags";
import { WarRow } from "@/components/wars/war-parts";
import { isLocale, LOCALES, type Locale } from "@/i18n/locales";
import { Link } from "@/i18n/navigation";
import { pageLocale } from "@/i18n/page-locale";
import { loadCultures, loadWars } from "@/lib/data/load";
import { localize } from "@/lib/data/localize";
import { countryName, warCountryCodes, warsForCountry, warsShownIn } from "@/lib/data/wars";
import { openGraph, pageAlternates } from "@/lib/seo";

export const dynamic = "force-static";
export const dynamicParams = false;

/** Only countries with a war shown in this language get a page in it. */
export function generateStaticParams({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) return [];
  return warCountryCodes(warsShownIn(loadWars(), params.locale)).map((code) => ({ country: code.toLowerCase() }));
}

function countryWars(country: string, locale: Locale) {
  return warsForCountry(warsShownIn(loadWars(), locale), country.toUpperCase());
}

export async function generateMetadata({ params }: PageProps<"/[locale]/wars/[country]">): Promise<Metadata> {
  const locale = await pageLocale(params);
  const { country } = await params;
  const t = await getTranslations({ locale, namespace: "wars" });
  const name = countryName(country.toUpperCase(), locale);
  const shownIn = LOCALES.filter((l) => countryWars(country, l).length > 0);
  const appName = (await getTranslations({ locale, namespace: "common" }))("appName");
  return {
    title: t("countryTitle", { country: name }),
    description: t("countryMetaDescription", { country: name }),
    alternates: pageAlternates(locale, `wars/${country}`, shownIn),
    // The layout's openGraph would list every locale as an alternate.
    openGraph: openGraph(locale, appName, { path: "", alt: appName }, shownIn),
  };
}

/** One country's wars, oldest first: name, dates, sides, outcome. */
export default async function CountryWarsPage({ params }: PageProps<"/[locale]/wars/[country]">) {
  const locale = await pageLocale(params);
  const { country } = await params;
  const t = await getTranslations("wars");
  const wars = countryWars(country, locale);
  if (wars.length === 0) notFound();
  const name = countryName(country.toUpperCase(), locale);
  const cultureNames = Object.fromEntries(loadCultures().map((c) => [c.id, localize(c.name, locale)]));

  return (
    <section className="mx-auto flex w-full max-w-xl flex-col gap-6 pt-4">
      <header className="flex flex-col gap-2">
        <Link href="/wars" className="self-start text-sm text-muted-foreground underline-offset-2 hover:underline">
          {t("allCountries")}
        </Link>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <CountryFlag code={country.toUpperCase()} />
          {t("countryTitle", { country: name })}
        </h1>
        <p className="text-sm text-muted-foreground">{t("countryIntro", { country: name })}</p>
      </header>
      <ol className="flex flex-col gap-3">
        {wars.map((war) => (
          <li key={war.id}>
            <WarRow war={war} cultureNames={cultureNames} />
          </li>
        ))}
      </ol>
    </section>
  );
}
