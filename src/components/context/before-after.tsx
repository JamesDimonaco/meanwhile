import { Fragment } from "react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/locales";
import { localize } from "@/lib/data/localize";
import type { CultureRef, SuccessionGroup } from "@/lib/data/queries";
import { YearRangeText } from "@/components/settings/year-text";

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
      <Link href={`/c/${ref.id}`} className="font-medium underline-offset-2 hover:underline">
        {side === "before" && <span aria-hidden="true">← </span>}
        {localize(ref.name, locale)}
        {side === "after" && <span aria-hidden="true"> →</span>}
      </Link>{" "}
      <span className="text-xs text-muted-foreground">
        <YearRangeText start={ref.period.latestStart} end={ref.period.earliestEnd} />
      </span>
    </span>
  );

  return (
    <section className="flex flex-col gap-1.5">
      <h2 className="text-xs font-medium text-muted-foreground">{t("beforeAfter")}</h2>
      <ul className="flex flex-col gap-2 text-sm">
        {lines.map((line) => {
          const items = [...line.before.map((r) => item(r, "before")), ...line.after.map((r) => item(r, "after"))];
          return (
            <li key={line.place.en} className="flex flex-col gap-0.5">
              <p className="leading-relaxed">
                <span className="text-muted-foreground">{t("inPlace", { place: line.place[locale] })} </span>
                {items.map((node, i) => (
                  <Fragment key={i}>
                    {i > 0 && <span className="text-muted-foreground"> · </span>}
                    {node}
                  </Fragment>
                ))}
              </p>
              {line.notes.map((note) => (
                <p key={note.en} className="text-xs text-muted-foreground">
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
