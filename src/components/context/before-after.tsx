import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/locales";
import { localize } from "@/lib/data/localize";
import type { CultureRef, SuccessionGroup } from "@/lib/data/queries";
import { YearRangeText } from "@/components/settings/year-text";
import { SectionHeading, TEXT_LINK, TOUCH_AREA } from "@/components/ui/page";
import { cn } from "@/lib/utils";

export type BeforeAfterLine = Omit<SuccessionGroup, "before" | "after"> & {
  before: CultureRef[];
  after: CultureRef[];
};

/** "In the Valley of Mexico: ← Teotihuacan · Aztec →", one line per place. Renders nothing without links. */
export async function BeforeAfter({ lines, locale }: { lines: BeforeAfterLine[]; locale: Locale }) {
  if (lines.length === 0) return null;
  const t = await getTranslations({ locale, namespace: "context" });

  const item = (ref: CultureRef, side: "before" | "after") => (
    <span key={`${side}-${ref.id}`}>
      <span className="sr-only">{t(side === "before" ? "cameBefore" : "cameAfter")} </span>
      <Link prefetch={false} href={`/c/${ref.id}`} className={cn(TEXT_LINK, TOUCH_AREA, "inline-flex min-h-6 items-center font-medium")}>
        {side === "before" && <span aria-hidden="true">← </span>}
        {localize(ref.name, locale)}
        {side === "after" && <span aria-hidden="true"> →</span>}
      </Link>{" "}
      <span className="text-muted-foreground">
        <YearRangeText start={ref.period.latestStart} end={ref.period.earliestEnd} plain />
      </span>
    </span>
  );

  return (
    <section className="flex flex-col gap-3">
      <SectionHeading>{t("beforeAfter")}</SectionHeading>
      <ul className="flex flex-col gap-4 text-sm">
        {lines.map((line) => {
          return (
            <li key={line.place.en} className="flex flex-col gap-1">
              <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1.5">
                <span className="text-muted-foreground">{t("inPlace", { place: line.place[locale] })}</span>
                {line.before.map((r) => item(r, "before"))}
                {line.after.map((r) => item(r, "after"))}
              </p>
              {line.notes.map((note) => (
                <p key={note.en} className="text-sm text-muted-foreground">
                  {localize(note, locale)}
                </p>
              ))}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
