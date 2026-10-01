import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { SourceList } from "@/components/culture/culture-events";
import { regionsIn } from "@/components/filters/region-filter";
import { HeartlandFlags } from "@/components/identity/heartland-flags";
import { MeanwhileCards } from "@/components/meanwhile/meanwhile-cards";
import { YearText } from "@/components/settings/year-text";
import { EventStory } from "@/components/territory-map/culture-story";
import { Casualties } from "@/components/wars/casualties";
import { SideList, WarDates } from "@/components/wars/war-parts";
import { WarBar } from "@/components/wars/war-bar";
import { isLocale, LOCALES } from "@/i18n/locales";
import { Link } from "@/i18n/navigation";
import { pageLocale } from "@/i18n/page-locale";
import { firstSentence } from "@/lib/data/culture-copy";
import { hasTerritoryMap, loadCultures, loadWars } from "@/lib/data/load";
import { localize } from "@/lib/data/localize";
import { activeAt, meanwhileAtYear } from "@/lib/data/queries";
import { isShownIn, warSpan, warsShownIn } from "@/lib/data/wars";
import { openGraph, pageAlternates } from "@/lib/seo";

export const dynamic = "force-static";
export const dynamicParams = false;

/** The review gate: a war gets a page only in the languages it is shown in. */
export function generateStaticParams({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) return [];
  return warsShownIn(loadWars(), params.locale).map((w) => ({ id: w.id }));
}

function findWar(id: string) {
  const war = loadWars().find((w) => w.id === id);
  if (!war) notFound();
  return war;
}

export async function generateMetadata({ params }: PageProps<"/[locale]/war/[id]">): Promise<Metadata> {
  const locale = await pageLocale(params);
  const { id } = await params;
  const war = findWar(id);
  const shownIn = LOCALES.filter((l) => isShownIn(war, l));
  const appName = (await getTranslations({ locale, namespace: "common" }))("appName");
  const title = localize(war.name, locale);
  return {
    title,
    description: firstSentence(localize(war.description, locale), locale),
    alternates: pageAlternates(locale, `war/${id}`, shownIn),
    // Names the segment's opengraph-image itself, since Next's own URL for it
    // has no trailing slash; and the layout's openGraph would list every locale.
    openGraph: openGraph(locale, appName, { path: `war/${id}`, alt: title }, shownIn),
  };
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

/** One war: names, dates, sides, account, phases, map and events, leaders, deaths, links back into Meanwhile. */
export default async function WarPage({ params }: PageProps<"/[locale]/war/[id]">) {
  const locale = await pageLocale(params);
  const { id } = await params;
  const war = findWar(id);
  if (!isShownIn(war, locale)) notFound();
  const t = await getTranslations("wars");
  const tCommon = await getTranslations("common");
  const cultures = loadCultures();
  const shown = warsShownIn(loadWars(), locale);
  const span = warSpan(war);

  const ownCultures = new Set([
    ...war.cultures,
    ...war.sides.flatMap((s) => s.members.flatMap((m) => (m.kind === "culture" ? [m.id] : []))),
  ]);
  const cultureNames = Object.fromEntries(cultures.map((c) => [c.id, localize(c.name, locale)]));
  const eventWorld = Object.fromEntries(
    war.events.map((e) => [e.id, activeAt(cultures, e.start).filter((a) => !ownCultures.has(a.culture.id))]),
  );
  const { candidates, cards } = meanwhileAtYear(span.start, cultures, [...ownCultures]);
  const anchorRegion = cultures.find((c) => ownCultures.has(c.id))?.region ?? null;
  const before = shown.find((w) => w.id === war.follows);
  const after = shown.filter((w) => w.follows === war.id);
  const linked = cultures.filter((c) => war.cultures.includes(c.id));
  const sideLabels = new Map(war.sides.map((s) => [s.id, localize(s.label, locale)]));

  return (
    <article className="mx-auto flex w-full max-w-xl flex-col gap-8 pt-4">
      <header className="flex flex-col gap-3">
        <Link href="/wars" className="self-start text-sm text-muted-foreground underline-offset-2 hover:underline">
          {tCommon("nav.wars")}
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">{localize(war.name, locale)}</h1>
        {war.altNames.length > 0 && (
          <ul className="flex flex-col gap-0.5 text-sm text-muted-foreground">
            {war.altNames.map((a) => (
              <li key={a.text}>
                {t.rich(a.gloss ? "altNameGloss" : "altName", {
                  usedBy: localize(a.usedBy, locale),
                  gloss: a.gloss ? localize(a.gloss, locale) : "",
                  name: () => (
                    <span lang={a.lang} className="text-foreground">
                      {a.text}
                    </span>
                  ),
                })}
              </li>
            ))}
          </ul>
        )}
        <p className="text-sm text-muted-foreground">
          <WarDates span={span} />
        </p>
        <WarBar war={war} />
        <Link
          href={{ pathname: "/timeline", query: { year: String(span.start) } }}
          className="self-start text-sm underline underline-offset-2"
        >
          {t("onTimeline")}
        </Link>
        {locale !== "en" && !war.reviewed[locale] && (
          <p className="text-xs text-muted-foreground">{tCommon("machineTranslated")}</p>
        )}
      </header>

      <Section title={t("sides")}>
        <SideList sides={war.sides} cultureNames={cultureNames} linkCultures />
      </Section>

      <Section title={t("account")}>
        <p className="text-base leading-relaxed">{localize(war.description, locale)}</p>
        <p className="text-sm">
          <span className="font-medium">{t("outcome")}: </span>
          {localize(war.outcome, locale)}
        </p>
      </Section>

      {war.events.length > 0 && (
        <Section title={t("events")}>
          <EventStory
            events={war.events}
            eventWorld={eventWorld}
            bordersId={hasTerritoryMap(war.id) ? war.id : null}
            land="world"
            allPins
            nameSelf
          />
        </Section>
      )}

      {war.leaders.length > 0 && (
        <Section title={t("leaders")}>
          <ul className="flex flex-col gap-1.5 text-sm">
            {war.leaders.map((l) => (
              <li key={l.wikidataId}>
                <span className="font-medium">{localize(l.name, locale)}</span>
                <span className="text-muted-foreground">
                  {" · "}
                  {localize(l.role, locale)} · {sideLabels.get(l.side)}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {war.casualties.length > 0 && (
        <Section title={t("casualties")}>
          <Casualties casualties={war.casualties} sides={war.sides} />
        </Section>
      )}

      {(before || after.length > 0) && (
        <nav className="flex flex-col gap-2 text-sm">
          {before && (
            <p>
              <span className="text-muted-foreground">{t("before")}: </span>
              <Link href={`/war/${before.id}`} className="underline underline-offset-2">
                {localize(before.name, locale)}
              </Link>
            </p>
          )}
          {after.map((w) => (
            <p key={w.id}>
              <span className="text-muted-foreground">{t("after")}: </span>
              <Link href={`/war/${w.id}`} className="underline underline-offset-2">
                {localize(w.name, locale)}
              </Link>
            </p>
          ))}
        </nav>
      )}

      {linked.length > 0 && (
        <Section title={t("cultures")}>
          <ul className="flex flex-col gap-1.5">
            {linked.map((c) => (
              <li key={c.id}>
                <Link href={`/c/${c.id}`} className="inline-flex items-center gap-1.5 underline underline-offset-2">
                  {localize(c.name, locale)}
                  <HeartlandFlags cultureId={c.id} />
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {candidates.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold tracking-tight">
            {t.rich("meanwhile", { year: () => <YearText year={span.start} /> })}
          </h2>
          <MeanwhileCards
            anchor={null}
            candidates={candidates}
            cards={cards}
            anchorRegion={anchorRegion}
            regions={regionsIn(cultures)}
            locale={locale}
          />
        </section>
      )}

      <SourceList sources={war.sources} />
    </article>
  );
}
