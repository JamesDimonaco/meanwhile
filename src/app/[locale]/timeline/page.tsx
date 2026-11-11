import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { pageLocale } from "@/i18n/page-locale";
import { toTimelineCulture } from "@/components/timeline/timeline-layout";
import { WorldTimeline } from "@/components/timeline/world-timeline";
import { loadCultures } from "@/lib/data/load";
import { openGraph, pageAlternates } from "@/lib/seo";
import { PageTitle } from "@/components/ui/page";

export async function generateMetadata({ params }: PageProps<"/[locale]/timeline">): Promise<Metadata> {
  const locale = await pageLocale(params);
  const t = await getTranslations({ locale, namespace: "timeline" });
  const title = t("title");
  const description = t("metaDescription");
  const appName = (await getTranslations({ locale, namespace: "common" }))("appName");
  return {
    title,
    description,
    alternates: pageAlternates(locale, "timeline"),
    openGraph: openGraph(locale, appName, { path: "timeline", alt: title }),
  };
}

/** Owned by the timeline agent. ?year= and ?regions= are read client-side inside WorldTimeline. */
export default async function TimelinePage({ params }: PageProps<"/[locale]/timeline">) {
  const locale = await pageLocale(params);
  const t = await getTranslations("timeline");
  const cultures = loadCultures().map((c) => toTimelineCulture(c, locale));
  return (
    <section className="flex flex-col gap-4 pt-2">
      <PageTitle>{t("title")}</PageTitle>
      <WorldTimeline cultures={cultures} />
    </section>
  );
}
