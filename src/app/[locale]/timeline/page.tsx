import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { pageLocale } from "@/i18n/page-locale";
import { Suspense } from "react";
import { toTimelineCulture } from "@/components/timeline/timeline-layout";
import { WorldTimeline } from "@/components/timeline/world-timeline";
import { loadCultures } from "@/lib/data/load";

export async function generateMetadata({ params }: PageProps<"/[locale]/timeline">): Promise<Metadata> {
  const locale = await pageLocale(params);
  const t = await getTranslations({ locale, namespace: "timeline" });
  return { title: t("title") };
}

/** Owned by the timeline agent. ?year= is read client-side inside WorldTimeline. */
export default async function TimelinePage({ params }: PageProps<"/[locale]/timeline">) {
  const locale = await pageLocale(params);
  const t = await getTranslations("timeline");
  const cultures = loadCultures().map((c) => toTimelineCulture(c, locale));
  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      {/* useSearchParams needs a Suspense boundary in a static export. */}
      <Suspense>
        <WorldTimeline cultures={cultures} />
      </Suspense>
    </section>
  );
}
