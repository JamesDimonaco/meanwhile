import { useLocale, useTranslations } from "next-intl";
import { SourceList } from "@/components/culture/culture-events";
import { localize } from "@/lib/data/localize";
import type { Casualty, Side } from "@/lib/data/war-schema";
import { casualtyGroups } from "@/lib/data/wars";
import { formatIsoDate } from "@/lib/years";
import { Card, SectionHeading } from "@/components/ui/page";

export function Casualties({ casualties, sides }: { casualties: readonly Casualty[]; sides: readonly Side[] }) {
  const t = useTranslations("wars");
  const locale = useLocale();
  const counted = ({ side: id, who }: Casualty) => {
    if (who) return localize(who, locale);
    const side = id && sides.find((s) => s.id === id);
    return side ? localize(side.label, locale) : t("allSides");
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">{t("casualtiesIntro")}</p>
      {casualtyGroups(casualties).map((figures) => (
        <section key={`${figures[0].scope}|${figures[0].side}|${figures[0].who?.en}`} className="flex flex-col gap-2">
          <SectionHeading as="h3" size="sub">
            {t(`scope.${figures[0].scope}`)} · {counted(figures[0])}
          </SectionHeading>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {figures.map((c, i) => (
              <Card as="li" key={i} className="flex flex-col gap-2 text-sm">
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
                <SourceList sources={c.sources} as="h4" />
              </Card>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
