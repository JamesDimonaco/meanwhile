import { useTranslations } from "next-intl";

/** Small "disputed" flag: uncertainty shown, not hidden. */
export function DisputedBadge({ note }: { note?: string }) {
  const t = useTranslations("common");
  return (
    <span
      title={note}
      className="inline-flex items-center rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400"
    >
      {t("disputed")}
    </span>
  );
}
