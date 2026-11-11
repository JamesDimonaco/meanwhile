import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { pageLocale } from "@/i18n/page-locale";
import { hasTerritoryMap, loadBorders, loadCultures, loadSuccession, loadWars } from "@/lib/data/load";
import type { Locale } from "@/i18n/locales";
import type { Source } from "@/lib/data/schema";
import { Card, CARD_TITLE, Page, PageIntro, PageTitle, Pill, SectionHeading, TEXT_LINK } from "@/components/ui/page";
import { cn } from "@/lib/utils";
import { datasetJsonLd, jsonLd, openGraph, pageAlternates } from "@/lib/seo";

export async function generateMetadata({ params }: PageProps<"/[locale]/credits">): Promise<Metadata> {
  const locale = await pageLocale(params);
  const t = await getTranslations({ locale, namespace: "credits" });
  const title = t("title");
  const appName = (await getTranslations({ locale, namespace: "common" }))("appName");
  const description = t("metaDescription", { appName });
  return {
    title,
    description,
    alternates: pageAlternates(locale, "credits"),
    openGraph: openGraph(locale, appName, { path: "credits", alt: title }),
  };
}

const SOURCE_KEYS = [
  "periodo",
  "wikidata",
  "cliopatria",
  "pleiades",
  "ucdp",
  "correlatesOfWar",
  "brecke",
  "naturalEarth",
  "flagIcons",
  "fonts",
] as const;
type SourceKey = (typeof SOURCE_KEYS)[number];

/** The datasets that ask to be cited in a set form. */
const CITED_KEYS = ["ucdp", "correlatesOfWar", "brecke"] as const;
const isCited = (key: SourceKey): key is (typeof CITED_KEYS)[number] => (CITED_KEYS as readonly string[]).includes(key);

/** Every source cited anywhere in the dataset, once each, alphabetical; a war only where the review gate shows it. */
function worksCited(locale: Locale): Source[] {
  const byCitation = new Map<string, Source>();
  const add = (sources: Source[]) => sources.forEach((s) => byCitation.set(s.citation, s));
  for (const c of loadCultures()) {
    for (const item of [...c.periods, ...c.phases, ...c.events, ...c.facts]) add(item.sources);
    if (hasTerritoryMap(c.id)) add(loadBorders(c.id).sources);
  }
  for (const link of loadSuccession()) add(link.sources);
  for (const w of loadWars(locale)) {
    for (const item of [w.period ?? w.ongoing, ...w.phases, ...w.events, ...w.casualties, w]) if (item) add(item.sources);
    if (hasTerritoryMap(w.id)) add(loadBorders(w.id).sources);
  }
  return [...byCitation.values()].sort((a, b) => a.citation.localeCompare(b.citation, "en"));
}

/** Every data source, its licence and what the site did with it. */
export default async function CreditsPage({ params }: PageProps<"/[locale]/credits">) {
  const locale = await pageLocale(params);
  const t = await getTranslations({ locale, namespace: "credits" });
  const works = worksCited(locale);
  const appName = (await getTranslations({ locale, namespace: "common" }))("appName");

  return (
    <Page as="section" className="gap-6">
      {locale === "en" && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: jsonLd(
              datasetJsonLd(
                {
                  name: t("datasetName", { appName }),
                  keywords: t("datasetKeywords"),
                  description: (values) => t("datasetDescription", values),
                },
                loadCultures(),
                loadWars(locale),
              ),
            ),
          }}
        />
      )}
      <header className="flex flex-col gap-2">
        <PageTitle>{t("title")}</PageTitle>
        <PageIntro>{t("intro", { appName })}</PageIntro>
        <p className="text-sm font-medium">{t("dataLicence")}</p>
      </header>

      <ul className="flex flex-col gap-3">
        {SOURCE_KEYS.map((key) => (
          <Card as="li" key={key} className="flex flex-col gap-2">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <SectionHeading className={CARD_TITLE}>
                {t(`sources.${key}.name`)}
              </SectionHeading>
              <Pill>{t(`sources.${key}.licence`)}</Pill>
            </div>
            <p className="text-sm text-muted-foreground">{t(`sources.${key}.used`)}</p>
            <p className="text-sm text-muted-foreground">{t(`sources.${key}.changes`, { appName })}</p>
            {isCited(key) && (
              <p className="text-sm text-muted-foreground">
                {t.rich("citeAs", {
                  cite: t(`sources.${key}.cite`),
                  label: (chunks) => <span className="font-medium text-foreground">{chunks}</span>,
                })}
              </p>
            )}
          </Card>
        ))}
      </ul>

      <p className="text-sm text-muted-foreground">{t("neverUsed")}</p>

      <details className="rounded-xl border border-border bg-card p-4">
        <summary className="cursor-pointer rounded-md font-semibold focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">{t("worksCited", { count: works.length })}</summary>
        <ul className="mt-3 flex flex-col gap-2 text-sm text-muted-foreground">
          {works.map((source) => (
            <li key={source.citation}>
              {source.url ? (
                <a href={source.url} target="_blank" rel="noreferrer" className={cn(TEXT_LINK, "break-words")}>
                  {source.citation}
                </a>
              ) : (
                source.citation
              )}
            </li>
          ))}
        </ul>
      </details>
    </Page>
  );
}
