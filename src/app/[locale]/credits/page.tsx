import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { pageLocale } from "@/i18n/page-locale";

export async function generateMetadata({ params }: PageProps<"/[locale]/credits">): Promise<Metadata> {
  const locale = await pageLocale(params);
  const t = await getTranslations({ locale, namespace: "credits" });
  return { title: t("title") };
}

/** Stub: ui-core lists every source and licence (Cliopatria and DARE require attribution). */
export default async function CreditsPage({ params }: PageProps<"/[locale]/credits">) {
  await pageLocale(params);
  const t = await getTranslations("credits");
  return (
    <section className="mx-auto flex max-w-xl flex-col gap-4">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      <p>{t("dataLicence")}</p>
    </section>
  );
}
