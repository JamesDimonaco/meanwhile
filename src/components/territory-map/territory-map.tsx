"use client";

import { geoPath } from "d3-geo";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useEffect, useId, useMemo, useState } from "react";
import { YearText } from "@/components/settings/year-text";
import { localize } from "@/lib/data/localize";
import type { Borders, Geometry, Place } from "@/lib/data/schema";
import { forD3, MAP_HEIGHT, MAP_WIDTH, mapExtent, mapProjection, snapshotAt } from "@/lib/map/geo";
import { MapFrame } from "./map-frame";

type GeoData = { land: Geometry; borders: Borders | null };

/** Full soft-frontier feather, for a polity as large as the map frame itself. */
const MAX_FEATHER = 3;
/** Feather floor: still soft, but small polities (early rivals, a fledgling kingdom) stay visible under it. */
const MIN_FEATHER = 0.4;
/** The frame is fixed to the culture's largest-ever extent, so an early or minor polity can project
 *  to a few px: below this size (min of width/height, in projected px) it gets the floor values. */
const SIZE_FLOOR_PX = 6;
/** Projected px at and above which a polity gets the full, unboosted feather and opacity. */
const SIZE_CEIL_PX = 130;

function lerp(min: number, max: number, minDimension: number): number {
  const t = Math.min(1, Math.max(0, (minDimension - SIZE_FLOOR_PX) / (SIZE_CEIL_PX - SIZE_FLOOR_PX)));
  return min + t * (max - min);
}

/** Scales the border blur down for small polygons so they don't dissolve under a feather sized for the biggest one. */
function featherFor(minDimension: number): number {
  return lerp(MIN_FEATHER, MAX_FEATHER, minDimension);
}

/**
 * A polity a few px across still gets diluted toward invisibility by the feather even at MIN_FEATHER,
 * since the blur's spread is large relative to the shape's own size: make up for it with more opacity,
 * tapering back to the normal, softer look once a polity is big enough to carry the feather on its own.
 */
function opacityFor(minDimension: number, base: number, boosted: number): number {
  return lerp(boosted, base, minDimension);
}

const cache = new Map<string, Promise<unknown>>();

// Cached per URL for the session; a failed fetch is dropped so a remount retries.
function fetchJson(url: string): Promise<unknown> {
  let request = cache.get(url);
  if (!request) {
    request = fetch(url).then((res) => {
      if (!res.ok) throw new Error(`${url}: ${res.status}`);
      return res.json();
    });
    request.catch(() => cache.delete(url));
    cache.set(url, request);
  }
  return request;
}

// Both files are written by us: the land file is Natural Earth cut and
// simplified for this map's frame by scripts/build-land.ts, and the borders
// file is served from data/borders; validate-data checks both at build time.
async function loadGeoData(id: string, hasBorders: boolean): Promise<GeoData> {
  const [landData, borders] = await Promise.all([
    fetchJson(`/geo/land/${id}.json`),
    hasBorders ? fetchJson(`/geo/borders/${id}.json`) : null,
  ]);
  return { land: landData as Geometry, borders: borders as Borders | null };
}

// Shared so a map without pins keeps the same array across renders: MapSvg's projection memo depends on it.
const NO_PINS: readonly Place[] = [];

type Props = {
  /** The culture or war id: names its land file, and its borders file when it has one. */
  id: string;
  hasBorders: boolean;
  year: number;
  pin: Place | null;
  /** Every place in the story, drawn faintly so the one in view stands out; the frame fits them too. */
  pins?: readonly Place[];
  /** Name the red (self) polities in the caption: a war map has no culture page title to say who they are. */
  nameSelf?: boolean;
};

/** Borders for the year over a land basemap, rivals in grey, a pin for the event in view. */
export function TerritoryMap({ id, hasBorders, year, pin, pins = NO_PINS, nameSelf = false }: Props) {
  const t = useTranslations("map");
  const [data, setData] = useState<GeoData | "error" | null>(null);

  useEffect(() => {
    let live = true;
    loadGeoData(id, hasBorders).then(
      (d) => live && setData(d),
      () => live && setData("error"),
    );
    return () => {
      live = false;
    };
  }, [id, hasBorders]);

  if (data === "error") return <MapFrame>{t("unavailable")}</MapFrame>;
  if (!data) return <MapFrame>{t("loading")}</MapFrame>;
  return <MapSvg land={data.land} borders={data.borders} year={year} pin={pin} pins={pins} nameSelf={nameSelf} />;
}

function MapSvg({
  land,
  borders,
  year,
  pin,
  pins,
  nameSelf,
}: {
  land: Geometry;
  borders: Borders | null;
  year: number;
  pin: Place | null;
  pins: readonly Place[];
  nameSelf: boolean;
}) {
  const t = useTranslations("map");
  const locale = useLocale();
  const filterId = useId();

  const { project, landPath, snapshots } = useMemo(() => {
    const projection = mapProjection(mapExtent(borders, pins));
    const toPath = geoPath(projection);
    return {
      project: (p: Place) => projection([p.lon, p.lat]),
      landPath: toPath(forD3(land)) ?? "",
      snapshots: (borders?.snapshots ?? []).map((s) => ({
        year: s.year,
        polities: s.polities.map((p) => {
          const feature = forD3(p.geometry);
          const [[x0, y0], [x1, y1]] = toPath.bounds(feature);
          const size = Math.min(x1 - x0, y1 - y0);
          return {
            ...p,
            d: toPath(feature) ?? "",
            feather: featherFor(size),
            fillOpacity: opacityFor(size, p.role === "self" ? 0.45 : 0.35, 0.9),
            strokeOpacity: opacityFor(size, p.role === "self" ? 0.4 : 0.25, 0.8),
          };
        }),
      })),
    };
  }, [land, borders, pins]);

  const snapshot = snapshotAt(snapshots, year);
  const rivals = snapshot?.polities.filter((p) => p.role === "rival") ?? [];
  const selves = snapshot?.polities.filter((p) => p.role === "self") ?? [];
  const pinAt = pin && project(pin);
  const names = (list: { label: Borders["snapshots"][number]["polities"][number]["label"] }[]) =>
    new Intl.ListFormat(locale).format(list.map((p) => localize(p.label, locale)));

  return (
    <figure className="flex flex-col gap-1">
      <svg
        viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
        className="w-full rounded-lg bg-muted"
        role="img"
        aria-label={t("title")}
      >
        <defs>
          {/* Pre-modern frontiers were zones, not lines: blur every border, less for a small polity than a big one (see featherFor). */}
          {snapshot?.polities.map((p) => (
            <filter key={p.id} id={`${filterId}-${p.id}`} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation={p.feather} />
            </filter>
          ))}
        </defs>
        <path d={landPath} className="fill-[oklch(0.88_0.02_90)] stroke-border dark:fill-background" strokeWidth={0.5} />
        {snapshot && (
          <g key={snapshot.year} className="animate-in fade-in duration-500">
            {snapshot.polities.map((p) => (
              <path
                key={p.id}
                d={p.d}
                filter={`url(#${filterId}-${p.id})`}
                strokeWidth={5}
                strokeLinejoin="round"
                style={{ fillOpacity: p.fillOpacity, strokeOpacity: p.strokeOpacity }}
                className={p.role === "self" ? "fill-red-700 stroke-red-700 dark:fill-red-400 dark:stroke-red-400" : "fill-muted-foreground stroke-muted-foreground"}
              />
            ))}
          </g>
        )}
        {pins.map((p, i) => {
          const at = project(p);
          return at && <circle key={i} cx={at[0]} cy={at[1]} r={2.5} className="fill-foreground/40" />;
        })}
        {pinAt && (
          <g transform={`translate(${pinAt[0]} ${pinAt[1]})`}>
            <circle r={9} className="fill-foreground/15" />
            <circle r={4.5} strokeWidth={1.5} className="fill-foreground stroke-background" />
          </g>
        )}
      </svg>
      <figcaption className="flex flex-col gap-0.5 text-xs text-muted-foreground">
        {borders && (
          <span className="text-sm text-foreground">
            {snapshot
              ? t.rich("bordersAround", { year: () => <YearText year={snapshot.year} /> })
              : t.rich("beforeBorders", { year: () => <YearText year={borders.snapshots[0].year} /> })}
          </span>
        )}
        {nameSelf && selves.length > 0 && (
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="size-2.5 rounded-full bg-red-700/60 dark:bg-red-400/60" />
            {names(selves)}
          </span>
        )}
        {rivals.length > 0 && (
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="size-2.5 rounded-full bg-muted-foreground/50" />
            {t("rivals", { names: names(rivals) })}
          </span>
        )}
        {/* Full citations and the changes made are on the credits page. */}
        <Link prefetch={false} href="/credits" className="underline-offset-2 hover:underline">
          {borders ? t("credit") : t("landCredit")}
        </Link>
      </figcaption>
    </figure>
  );
}
