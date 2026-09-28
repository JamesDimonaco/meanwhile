import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { pageLocale } from "@/i18n/page-locale";

export async function generateMetadata({ params }: PageProps<"/[locale]/credits">): Promise<Metadata> {
  const locale = await pageLocale(params);
  const t = await getTranslations({ locale, namespace: "credits" });
  return { title: t("title") };
}

const SOURCE_KEYS = ["periodo", "wikidata", "cliopatria", "pleiades", "dare"] as const;

/** Every data source, its licence and what Meanwhile did with it. */
export default async function CreditsPage({ params }: PageProps<"/[locale]/credits">) {
  const locale = await pageLocale(params);
  const t = await getTranslations({ locale, namespace: "credits" });

  return (
    <section className="mx-auto flex w-full max-w-xl flex-col gap-6 pt-4">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("intro")}</p>
        <p className="text-sm font-medium">{t("dataLicence")}</p>
      </header>

      <ul className="flex flex-col gap-4">
        {SOURCE_KEYS.map((key) => (
          <li key={key} className="flex flex-col gap-1 rounded-lg border border-border p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-medium">{t(`sources.${key}.name`)}</h2>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {t(`sources.${key}.licence`)}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{t(`sources.${key}.used`)}</p>
            <p className="text-sm text-muted-foreground">{t(`sources.${key}.changes`)}</p>
          </li>
        ))}
      </ul>

      <p className="text-sm text-muted-foreground">{t("neverUsed")}</p>
    </section>
  );
}
