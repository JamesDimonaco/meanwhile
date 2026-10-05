import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { CompareView } from "@/components/compare/compare-view";
import { toSearchEntry } from "@/components/search/search-index";
import { pageLocale } from "@/i18n/page-locale";
import { loadCultures } from "@/lib/data/load";

export async function generateMetadata({ params }: PageProps<"/[locale]/compare">): Promise<Metadata> {
  const locale = await pageLocale(params);
  const t = await getTranslations({ locale, namespace: "compare" });
  // Every ?ids= variant is the same client-rendered shell: keep them out of the index but let crawlers follow the links.
  return { title: t("title"), robots: { index: false, follow: true } };
}

/** Two cultures side by side (a third on wider screens). ?ids= is read client-side inside CompareView. */
export default async function ComparePage({ params }: PageProps<"/[locale]/compare">) {
  await pageLocale(params);
  return (
    <div className="mx-auto w-full max-w-4xl pt-4">
      {/* useSearchParams needs a Suspense boundary in a prerendered page. */}
      <Suspense>
        <CompareView entries={loadCultures().map(toSearchEntry)} />
      </Suspense>
    </div>
  );
}
