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
  return { title: t("title") };
}

/** Two cultures side by side (a third on wider screens). ?ids= is read client-side inside CompareView. */
export default async function ComparePage({ params }: PageProps<"/[locale]/compare">) {
  await pageLocale(params);
  return (
    <div className="mx-auto w-full max-w-4xl pt-4">
      {/* useSearchParams needs a Suspense boundary in a static export. */}
      <Suspense>
        <CompareView entries={loadCultures().map(toSearchEntry)} />
      </Suspense>
    </div>
  );
}
