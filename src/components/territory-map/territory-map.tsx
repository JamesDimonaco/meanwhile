"use client";

import { geoAzimuthalEqualArea, geoBounds, geoPath } from "d3-geo";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useId, useMemo, useState } from "react";
import { YearText } from "@/components/settings/year-text";
import { localize } from "@/lib/data/localize";
import type { Borders, Geometry, Place } from "@/lib/data/schema";
import { forD3, snapshotAt } from "./geo";
import { MapFrame, MAP_HEIGHT, MAP_WIDTH } from "./map-frame";

type GeoData = { land: Geometry; borders: Borders[] };

let geoData: Promise<GeoData> | undefined;

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return res.json();
}

// Both files are written by us: land.json is a prepared Natural Earth
// MultiPolygon, and borders.json is served from data/borders, which
// validate-data checks against the schema at build time.
function loadGeoData(): Promise<GeoData> {
  geoData ??= Promise.all([fetchJson("/geo/land.json"), fetchJson("/geo/borders.json")]).then(
    ([land, borders]) => ({ land: land as Geometry, borders: borders as Borders[] }),
  );
  geoData.catch(() => {
    geoData = undefined;
  });
  return geoData;
}

type Props = { cultureId: string; year: number; pin: Place | null };

/** Borders for the year over a land basemap, rivals in grey, a pin for the event in view. */
export function TerritoryMap({ cultureId, year, pin }: Props) {
  const t = useTranslations("map");
  const [data, setData] = useState<GeoData | "error" | null>(null);

  useEffect(() => {
    let live = true;
    loadGeoData().then(
      (d) => live && setData(d),
      () => live && setData("error"),
    );
    return () => {
      live = false;
    };
  }, []);

  if (data === "error") return <MapFrame>{t("unavailable")}</MapFrame>;
  if (!data) return <MapFrame>{t("loading")}</MapFrame>;
  const borders = data.borders.find((b) => b.cultureId === cultureId);
  if (!borders) return <MapFrame>{t("unavailable")}</MapFrame>;
  return <MapSvg land={data.land} borders={borders} year={year} pin={pin} />;
}

function MapSvg({ land, borders, year, pin }: { land: Geometry; borders: Borders; year: number; pin: Place | null }) {
  const t = useTranslations("map");
  const locale = useLocale();
  const filterId = useId();

  const { project, landPath, snapshots } = useMemo(() => {
    const own: Geometry[] = borders.snapshots.flatMap((s) =>
      s.polities.filter((p) => p.role === "self").map((p) => forD3(p.geometry)),
    );
    const everywhere = { type: "GeometryCollection" as const, geometries: own };
    const [[west, south], [east, north]] = geoBounds(everywhere);
    // Equal-area, centred on everywhere the culture ever held, so sizes compare
    // fairly across the Mediterranean and the frame never moves between years.
    const projection = geoAzimuthalEqualArea()
      .rotate([-(west + east) / 2, -(south + north) / 2])
      .fitExtent(
        [
          [16, 16],
          [MAP_WIDTH - 16, MAP_HEIGHT - 16],
        ],
        everywhere,
      );
    const toPath = geoPath(projection);
    return {
      project: (p: Place) => projection([p.lon, p.lat]),
      landPath: toPath(forD3(land)) ?? "",
      snapshots: borders.snapshots.map((s) => ({
        year: s.year,
        polities: s.polities.map((p) => ({ ...p, d: toPath(forD3(p.geometry)) ?? "" })),
      })),
    };
  }, [land, borders]);

  const snapshot = snapshotAt(snapshots, year);
  const rivals = snapshot?.polities.filter((p) => p.role === "rival") ?? [];
  const pinAt = pin && project(pin);

  return (
    <figure className="flex flex-col gap-1">
      <svg
        viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
        className="w-full rounded-lg bg-muted"
        role="img"
        aria-label={t("title")}
      >
        <defs>
          {/* Pre-modern frontiers were zones, not lines: blur every border. */}
          <filter id={filterId} x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
        </defs>
        <path d={landPath} className="fill-background stroke-border" strokeWidth={0.5} />
        {snapshot && (
          <g key={snapshot.year} filter={`url(#${filterId})`} className="animate-in fade-in duration-500">
            {snapshot.polities.map((p) => (
              <path
                key={p.id}
                d={p.d}
                strokeWidth={5}
                strokeLinejoin="round"
                className={
                  p.role === "self"
                    ? "fill-red-700/45 stroke-red-700/40 dark:fill-red-400/45 dark:stroke-red-400/40"
                    : "fill-muted-foreground/35 stroke-muted-foreground/25"
                }
              />
            ))}
          </g>
        )}
        {pinAt && (
          <g transform={`translate(${pinAt[0]} ${pinAt[1]})`}>
            <circle r={9} className="fill-foreground/15" />
            <circle r={4.5} strokeWidth={1.5} className="fill-foreground stroke-background" />
          </g>
        )}
      </svg>
      <figcaption className="flex flex-col gap-0.5 text-xs text-muted-foreground">
        <span className="text-sm text-foreground">
          {snapshot
            ? t.rich("bordersAround", { year: () => <YearText year={snapshot.year} /> })
            : t.rich("beforeBorders", { year: () => <YearText year={borders.snapshots[0].year} /> })}
        </span>
        {rivals.length > 0 && (
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="size-2.5 rounded-full bg-muted-foreground/50" />
            {t("rivals", { names: new Intl.ListFormat(locale).format(rivals.map((r) => localize(r.label, locale))) })}
          </span>
        )}
        <span>
          {borders.sources.map((s) => s.citation).join(" · ")} · {t("landCredit")}
        </span>
      </figcaption>
    </figure>
  );
}
