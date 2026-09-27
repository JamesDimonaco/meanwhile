"use client";

import { useTranslations } from "next-intl";

/** Stub: ui-core builds client-side search (names, native names, aliases, years). */
export function SearchBox() {
  const t = useTranslations("home");
  return (
    <label className="flex flex-col gap-1">
      <span>{t("searchLabel")}</span>
      <input type="search" placeholder={t("searchPlaceholder")} className="rounded border px-3 py-2" />
    </label>
  );
}
