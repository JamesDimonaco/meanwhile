"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { X } from "lucide-react";
import { EventDetail } from "@/components/culture/culture-events";
import type { SearchEntry } from "@/components/search/search-index";
import { YearRangeText } from "@/components/settings/year-text";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Link } from "@/i18n/navigation";
import { localize } from "@/lib/data/localize";
import { compareDataUrl, type CompareCulture, type CompareEvent } from "./compare-data";
import { compareHref, parseCompareIds } from "./compare-href";
import { overlapOf } from "./compare-math";
import { ComparePicker } from "./compare-picker";
import { EventSpine } from "./event-spine";
import { OverlapChart } from "./overlap-chart";
import { MAX_NARROW, MAX_WIDE, SLOTS, WIDE_QUERY } from "./slots";

const cache = new Map<string, Promise<CompareCulture>>();

function fetchCulture(id: string): Promise<CompareCulture> {
  let request = cache.get(id);
  if (!request) {
    // Our own build output, generated from validated data.
    request = fetch(compareDataUrl(id)).then((res) => {
      if (!res.ok) throw new Error(`${id}: ${res.status}`);
      return res.json() as Promise<CompareCulture>;
    });
    request.catch(() => cache.delete(id));
    cache.set(id, request);
  }
  return request;
}

function subscribeWide(onChange: () => void) {
  const query = window.matchMedia(WIDE_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** Phone first: the static HTML and first render assume a narrow screen. */
function useWide(): boolean {
  return useSyncExternalStore(
    subscribeWide,
    () => window.matchMedia(WIDE_QUERY).matches,
    () => false,
  );
}

type Loaded = { key: string; cultures: CompareCulture[] } | { key: string; failed: true };
type Selected = { side: number; event: CompareEvent };

/**
 * ?ids=a,b(,c) is read on the client so one static page serves every pair,
 * and the link can be shared. Only the shown cultures' data is fetched.
 */
export function CompareView({ entries }: { entries: SearchEntry[] }) {
  const t = useTranslations("compare");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const wide = useWide();
  const byId = useMemo(() => new Map(entries.map((e) => [e.id, e])), [entries]);

  const ids = parseCompareIds(searchParams.get("ids"), new Set(byId.keys()));
  const max = wide ? MAX_WIDE : MAX_NARROW;
  const shown = ids.slice(0, max);
  const hidden = ids.slice(max);
  const selected = shown.flatMap((id) => byId.get(id) ?? []);
  const key = shown.length >= 2 ? shown.join(",") : "";

  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [adding, setAdding] = useState(false);
  const [open, setOpen] = useState<Selected | null>(null);

  useEffect(() => {
    if (!key) return;
    let live = true;
    Promise.all(key.split(",").map(fetchCulture)).then(
      (cultures) => live && setLoaded({ key, cultures }),
      () => live && setLoaded({ key, failed: true }),
    );
    return () => {
      live = false;
    };
  }, [key, attempt]);

  const current = loaded?.key === key ? loaded : null;
  const cultures = current && "cultures" in current ? current.cultures : null;
  const overlap = cultures ? overlapOf(cultures.map((c) => c.period)) : null;
  const pickerLabel =
    selected.length === 0
      ? t("pickFirst")
      : selected.length === 1
        ? t("pickAnother", { name: localize(selected[0].name, locale) })
        : t("pickThird");

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        {selected.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {selected.map((entry, i) => (
              <li
                key={entry.id}
                className="flex items-center gap-1 rounded-full border border-border bg-card py-0.5 ps-3 pe-0.5 text-sm"
              >
                <span aria-hidden className={`size-2.5 rounded-full ${SLOTS[i].bg}`} />
                <Link prefetch={false} href={`/c/${entry.id}`} className="ms-1 font-medium underline-offset-2 hover:underline">
                  {localize(entry.name, locale)}
                </Link>
                <Link
                  prefetch={false}
                  href={compareHref(ids.filter((id) => id !== entry.id))}
                  aria-label={t("remove", { name: localize(entry.name, locale) })}
                  className="relative flex size-7 items-center justify-center rounded-full text-muted-foreground after:absolute after:-inset-1 hover:bg-muted hover:text-foreground"
                >
                  <X aria-hidden className="size-4" />
                </Link>
              </li>
            ))}
          </ul>
        )}
        {hidden.map((id) => (
          <p key={id} className="text-sm text-muted-foreground">
            {t("thirdHidden", { name: localize(byId.get(id)?.name ?? { en: id }, locale) })}
          </p>
        ))}
      </header>

      {selected.length < 2 ? (
        <ComparePicker key={shown.join(",")} entries={entries} selected={selected} label={pickerLabel} />
      ) : (
        wide &&
        selected.length < MAX_WIDE &&
        (adding ? (
          <ComparePicker key={shown.join(",")} entries={entries} selected={selected} label={pickerLabel} />
        ) : (
          <Button variant="outline" className="self-start" onClick={() => setAdding(true)}>
            {t("pickThird")}
          </Button>
        ))
      )}

      {key && !current && <p className="text-sm text-muted-foreground">{t("loading")}</p>}
      {current && "failed" in current && (
        <div className="flex flex-col items-start gap-2">
          <p className="text-sm">{t("loadError")}</p>
          <Button variant="outline" onClick={() => setAttempt((n) => n + 1)}>
            {t("retry")}
          </Button>
        </div>
      )}
      {cultures && overlap && (
        <>
          <OverlapChart cultures={cultures} overlap={overlap} />
          <EventSpine cultures={cultures} overlap={overlap} onSelect={(side, event) => setOpen({ side, event })} />
        </>
      )}

      <Dialog open={open !== null} onOpenChange={(next) => !next && setOpen(null)}>
        {open && cultures?.[open.side] && (
          <EventSheet
            culture={cultures[open.side]}
            side={open.side}
            event={open.event}
            byId={byId}
            onClose={() => setOpen(null)}
          />
        )}
      </Dialog>
    </div>
  );
}

function EventSheet({
  culture,
  side,
  event,
  byId,
  onClose,
}: {
  culture: CompareCulture;
  side: number;
  event: CompareEvent;
  byId: ReadonlyMap<string, SearchEntry>;
  onClose: () => void;
}) {
  const t = useTranslations("compare");
  const tCulture = useTranslations("culture");
  const locale = useLocale();
  const world = event.world.flatMap(({ id, certain }) => {
    const entry = byId.get(id);
    return entry ? [{ culture: entry, certain }] : [];
  });
  const name = localize(culture.name, locale);

  return (
    <DialogContent showCloseButton={false} className="max-h-[85dvh] overflow-y-auto sm:max-w-md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <p className="flex items-center gap-1.5 text-sm">
            <span aria-hidden className={`size-2.5 rounded-full ${SLOTS[side].bg}`} />
            <span className={`font-semibold ${SLOTS[side].text}`}>{name}</span>
            <span className="text-muted-foreground">· {tCulture(`eventTypes.${event.type}`)}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            <YearRangeText start={event.start} end={event.end ?? event.start} />
          </p>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label={t("close")}>
          <X aria-hidden />
        </Button>
      </div>
      <DialogTitle className="text-base leading-snug font-semibold">{localize(event.title, locale)}</DialogTitle>
      <div className="flex flex-col gap-3 text-sm">
        <EventDetail event={event} world={world} />
        <div className="flex flex-col gap-1.5 border-t border-border pt-3">
          <Link prefetch={false} href={`/c/${culture.id}`} className="underline underline-offset-2">
            {t("aboutCulture", { name })}
          </Link>
          <Link
            prefetch={false}
            href={{ pathname: "/timeline", query: { year: String(event.start) } }}
            className="underline underline-offset-2"
          >
            {t("onTimeline")}
          </Link>
        </div>
      </div>
    </DialogContent>
  );
}
