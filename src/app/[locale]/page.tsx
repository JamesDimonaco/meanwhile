import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { pageLocale } from "@/i18n/page-locale";
import { SearchBox } from "@/components/search/search-box";
import { Link } from "@/i18n/navigation";
import { loadCultures, loadPopular } from "@/lib/data/load";
import { localize } from "@/lib/data/localize";
import { toSearchEntry } from "@/components/search/search-index";
import { YearRangeText } from "@/components/settings/year-text";
import { pageAlternates } from "@/lib/seo";

export async function generateMetadata({ params }: PageProps<"/[locale]">): Promise<Metadata> {
  const locale = await pageLocale(params);
  const t = await getTranslations({ locale, namespace: "home" });
  const description = t("metaDescription");
  // No `openGraph` override here: setting one would replace (not merge
  // with) the layout's openGraph.siteName/locale/type, and og:title/
  // og:description already inherit from the plain title/description above.
  return { description, alternates: pageAlternates(locale, "") };
}

/** Home: one search box, popular starting points underneath. Owned by ui-core. */
export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const locale = await pageLocale(params);
  const t = await getTranslations("home");
  const tCommon = await getTranslations("common");
  const cultures = loadCultures();
  const entries = cultures.map(toSearchEntry);
  const popular = loadPopular().map(toSearchEntry);

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-8 pt-6">
      <header className="flex flex-col gap-1 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">{tCommon("appName")}</h1>
        <p className="text-sm text-muted-foreground">{tCommon("tagline")}</p>
      </header>

      <SearchBox entries={entries} />

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">{t("popular")}</h2>
        <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {popular.map((c) => (
            <li key={c.id}>
              <Link
                href={`/c/${c.id}`}
                className="flex flex-col gap-0.5 rounded-lg border border-border px-4 py-3 hover:bg-muted"
              >
                <span className="flex items-baseline gap-1.5">
                  <span className="font-medium">{localize(c.name, locale)}</span>
                  {c.nativeName && (
                    <span lang={c.nativeName.lang} className="text-muted-foreground">
                      {c.nativeName.text}
                    </span>
                  )}
                </span>
                <span className="text-sm text-muted-foreground">
                  {tCommon(`regions.${c.region}`)}
                  {" · "}
                  <YearRangeText start={c.period.latestStart} end={c.period.earliestEnd} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
