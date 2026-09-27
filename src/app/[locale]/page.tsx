import { getTranslations } from "next-intl/server";
import { pageLocale } from "@/i18n/page-locale";
import { SearchBox } from "@/components/search/search-box";
import { Link } from "@/i18n/navigation";
import { loadCultures } from "@/lib/data/load";
import { localize } from "@/lib/data/localize";

/** Home: one search box, popular starting points underneath. Owned by ui-core. */
export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const locale = await pageLocale(params);
  const t = await getTranslations("home");
  const cultures = loadCultures();

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <SearchBox />
      <section>
        <h2>{t("popular")}</h2>
        <ul>
          {cultures.map((c) => (
            <li key={c.id}>
              <Link href={`/c/${c.id}`}>{localize(c.name, locale)}</Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
