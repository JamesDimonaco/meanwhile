import { useLocale, useTranslations } from "next-intl";
import { CountryLink } from "@/components/identity/heartland-flags";
import { JoinedList } from "@/components/joined-list";
import { YearRangeText, YearText } from "@/components/settings/year-text";
import { Link } from "@/i18n/navigation";
import { localize } from "@/lib/data/localize";
import type { Side, SideMember, War } from "@/lib/data/war-schema";
import { warSpan, type WarSpan } from "@/lib/data/wars";
import { formatIsoDate } from "@/lib/years";

/** Culture id -> its name in the page's language, for culture members. */
export type CultureNames = Record<string, string>;

/** "1519–1521 CE", or "2022 – ongoing, as of 30 September 2026". */
export function WarDates({ span: { start, end, asOf } }: { span: WarSpan }) {
  const t = useTranslations("wars");
  const locale = useLocale();
  if (end !== null || asOf === null) return <YearRangeText start={start} end={end ?? start} />;
  return <span>{t.rich("ongoing", { start: () => <YearText year={start} />, date: formatIsoDate(asOf, locale) })}</span>;
}

type SideProps = { cultureNames: CultureNames; linkCultures: boolean; here?: string };

/** A modern state with its flag, linking to its country page; a culture by name (linked on the war page); a historical polity by plain name. */
function MemberName({ member, cultureNames, linkCultures, here }: SideProps & { member: SideMember }) {
  const locale = useLocale();
  if (member.kind === "state") return <CountryLink code={member.code} here={here} />;
  if (member.kind === "culture") {
    const name = cultureNames[member.id] ?? member.id;
    return linkCultures ? (
      <Link href={`/c/${member.id}`} className="underline underline-offset-2">
        {name}
      </Link>
    ) : (
      <span>{name}</span>
    );
  }
  return <span>{localize(member.name, locale)}</span>;
}

function SideLine({ side, ...props }: SideProps & { side: Side }) {
  const t = useTranslations("wars");
  const locale = useLocale();
  return (
    <div className="flex flex-col">
      <span className="font-medium text-foreground">{localize(side.label, locale)}</span>
      <p>
        <JoinedList
          items={side.members.map((m, i) =>
            m.role === "supporter" ? (
              <span key={i}>
                {t.rich("supporter", {
                  name: () => <MemberName member={m} {...props} />,
                  role: (chunks) => <span className="text-muted-foreground">{chunks}</span>,
                })}
              </span>
            ) : (
              <MemberName key={i} member={m} {...props} />
            ),
          )}
        />
      </p>
    </div>
  );
}

/**
 * Each side on its own line, "against" between them. Never aggressor and
 * victim: just who fought whom. On a country page, `here` is its code.
 */
export function SideList({
  sides,
  cultureNames,
  linkCultures = false,
  here,
}: {
  sides: readonly Side[];
  cultureNames: CultureNames;
  linkCultures?: boolean;
  here?: string;
}) {
  const t = useTranslations("wars");
  return (
    <div className="flex flex-col gap-0.5 text-sm text-muted-foreground">
      {sides.map((side, i) => (
        <div key={side.id} className="flex flex-col gap-0.5">
          {i > 0 && <span className="text-xs">{t("against")}</span>}
          <SideLine side={side} cultureNames={cultureNames} linkCultures={linkCultures} here={here} />
        </div>
      ))}
    </div>
  );
}

/** One war in a list: name linking to its page, dates, sides, one-line outcome. */
export function WarRow({ war, cultureNames }: { war: War; cultureNames: CultureNames }) {
  const locale = useLocale();
  return (
    <article className="flex flex-col gap-1.5 rounded-lg border border-border px-4 py-3">
      <Link href={`/war/${war.id}`} className="font-medium underline-offset-2 hover:underline">
        {localize(war.name, locale)}
      </Link>
      <span className="text-sm text-muted-foreground">
        <WarDates span={warSpan(war)} />
      </span>
      <SideList sides={war.sides} cultureNames={cultureNames} />
      <p className="text-sm">{localize(war.outcome, locale)}</p>
    </article>
  );
}
