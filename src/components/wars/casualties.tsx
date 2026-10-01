import { useLocale, useTranslations } from "next-intl";
import { SourceList } from "@/components/culture/culture-events";
import { localize } from "@/lib/data/localize";
import type { Casualty, Side } from "@/lib/data/war-schema";
import { formatIsoDate } from "@/lib/years";

/**
 * Death tolls grouped by what they count and for whom, so one party's
 * official figure sits beside the independent estimates of the same thing.
 */
export function Casualties({ casualties, sides }: { casualties: readonly Casualty[]; sides: readonly Side[] }) {
  const t = useTranslations("wars");
  const locale = useLocale();
  const groups = new Map<string, Casualty[]>();
  for (const c of casualties) {
    const key = `${c.scope}|${c.side ?? ""}`;
    groups.set(key, [...(groups.get(key) ?? []), c]);
  }
  const sideLabel = (id: string | undefined) => {
    const side = id && sides.find((s) => s.id === id);
    return side ? localize(side.label, locale) : t("allSides");
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">{t("casualtiesIntro")}</p>
      {[...groups.values()].map((figures) => (
        <section key={`${figures[0].scope}|${figures[0].side}`} className="flex flex-col gap-2">
          <h3 className="text-sm font-medium">
            {t(`scope.${figures[0].scope}`)} · {sideLabel(figures[0].side)}
          </h3>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {figures.map((c, i) => (
              <li key={i} className="flex flex-col gap-1.5 rounded-lg border border-border p-3 text-sm">
                <span className="text-lg font-semibold tabular-nums">
                  {c.low === c.high ? t("single", { count: c.low }) : t("range", { low: c.low, high: c.high })}
                </span>
                {(c.attributedTo || c.asOf) && (
                  <span className="text-muted-foreground">
                    {[c.attributedTo && t("according", { who: localize(c.attributedTo, locale) }), c.asOf && t("asOf", { date: formatIsoDate(c.asOf, locale) })]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                )}
                {c.note && <p className="text-muted-foreground">{localize(c.note, locale)}</p>}
                <SourceList sources={c.sources} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
