@AGENTS.md

# Meanwhile

Answers "I'm looking at this. What else was happening in the world at the same time?" in seconds.
Mobile-first static web app for travellers and museum visitors on weak signal, in en / es / zh (Simplified).

## Commands

`pnpm dev` · `pnpm build` (runs `validate-data`, then `next build` to `out/`, then fails on any Google host in the output) · `pnpm typecheck` (`next typegen` first, so `PageProps`/`LayoutProps` exist) · `pnpm test` (vitest) · `pnpm lint` · `pnpm validate-data`.

Before handing work back, run typecheck, test, lint, validate-data, and build if you touched pages.

## Layout

```
data/registry.json                   canonical culture ids + region (add an id here before its file)
data/cultures/<region>/<id>.json     one culture per file; region is the folder
data/borders/<cultureId>.json        territory-map snapshots (rome, carolingian-empire, holy-roman-empire)
messages/<locale>/<namespace>.json   UI text, one file per namespace per locale
scripts/                             validate-data.ts, check-no-google.ts, build-borders.ts
src/app/(root)/page.tsx              "/" : inline script picks a locale, redirects to /<locale>/
src/app/[locale]/layout.tsx          html, header (explainer trigger + language switcher), providers
src/app/[locale]/page.tsx            home / search
src/app/[locale]/c/[id]/page.tsx     Meanwhile screen + culture detail (moment first, detail below)
src/app/[locale]/timeline/page.tsx   world timeline; year in ?year= (astronomical), read client-side
src/app/[locale]/credits/page.tsx    sources and licences
src/i18n/                            locales, routing, navigation, request config, pageLocale()
src/lib/years.ts                     all year maths and formatting
src/lib/data/                        schema.ts (zod + types), load.ts (fs, build-time), queries.ts, localize.ts, validate.ts
src/components/<area>/               see Ownership
src/components/ui/                   shadcn components (base-nova, RTL-aware)
```

## Years

- Stored as signed integers, **astronomical numbering**: 1 CE = 1, 1 BCE = 0, 2 BCE = -1, 1200 BCE = -1199. Convert only on display, via `src/lib/years.ts`. There is no year zero on screen.
- Display: `formatYear` / `formatYearRange` (era labels per locale: en BCE/CE, es "a. e. c."/"e. c.", zh 公元前/公元; BC/AD style optional). In components use `<YearText year>` / `<YearRangeText start end>` from `src/components/settings/year-text.tsx` so every date gets the same era style, years-ago toggle and first-BCE explainer.
- `yearsAgo(year, currentYear())` and `roundYearsAgo`. Call `currentYear()` on the client: in a static export, server code runs at build time and would freeze the year.
- Parsing: `parseYearQuery` for what people type ("1200 BCE", "公元前1200年", "1200 a. C.", "AD 500"). A bare number is CE; a leading minus is BCE the human way ("-1200" = 1200 BCE = -1199). `parseYearParam` for `?year=`, which is the raw astronomical integer (`?year=-1199` = 1200 BCE).

## Data format

JSON, validated by zod in `src/lib/data/schema.ts` (the source of truth for field names). `data/cultures/china/shang.json` and `data/cultures/south-america/inca.json` are the reference files: copy their shape.

- **LocalizedText** `{ en, es?, zh? }`: English required; missing es/zh falls back to English (validation warns). `reviewed: { es, zh }` on each culture is `false` until a native speaker checks that language (machine-translated until then).
- **Source** `{ citation, url? }`. Every period, phase, event, fact and borders file has `sources: Source[]`. Events need at least 2 independent sources. Write facts in your own words; never copy source wording.
- **Culture**: `id` (kebab-case, in the registry), `region` (`china | south-america | mesoamerica | europe`), `wikidataId` (`Q…`), `name`, `nativeName? { text, lang }` (BCP 47 lang, e.g. `zh-Hans`, `qu`), `aliases[]` (search-only terms: pinyin, other spellings), `description`, `reviewed`, `periods[]`, `phases[]`, `events[]` (at least 5), `facts[]` (at least 1).
- **Period**: `id`, `label?`, `earliestStart`, `latestStart`, `earliestEnd`, `latestEnd`, `sources`, `periodoId?` (e.g. `p08m57h9sf6`), `default` (exactly one per culture), `disputed`, `note?`. The bar is solid from `latestStart` to `earliestEnd` and fades across the outer edges. Prefer a PeriodO definition from a major museum or standard reference (https://data.perio.do/d.json).
- **Phase** (segments of one bar): `id`, `name`, `start`, `end`, `sources`, ordered by start. Rome is one culture `rome` with phases kingdom / republic / empire / eastern; Maya is one culture `maya` with phases preclassic / classic / postclassic.
- **Event**: `id`, `start`, `end?`, `type` (`founding | ruler | invention | conflict | collapse`), `title`, `sources` (2+), `disputed`, `note?`, `place? { name, lat, lon, pleiadesId? }` (required for every event of a culture with a borders file: the map pins it).
- **Fact** (the "one vivid line" on a meanwhile card): `id`, `text`, `start`, `end`, `sources`, `disputed`.
- Mark anything contested `disputed: true` and say why in `note`.
- **Borders** `data/borders/<cultureId>.json`: `{ cultureId, sources, snapshots: [{ year, polities: [{ id, label, role: "self" | "rival", geometry }] }] }`, snapshots in ascending year. `geometry` is GeoJSON `Polygon` or `MultiPolygon`, `[lon, lat]`, simplified before committing. A borders file makes `hasTerritoryMap(id)` true, which swaps the detail page to `CultureStory` and serves it at `/geo/borders/<id>.json`. Never edit one by hand: add or change the culture's config in `scripts/build-borders.ts` and run `pnpm borders <cliopatria_polities_only.geojson> [id ...]` (the script's header says where to download Cliopatria; the dataset stays out of the repo). Cliopatria's BCE years have no year zero; the script converts them with `fromCliopatriaYear`.
- Validation fails on schema errors, duplicate ids, missing English, ids missing from the registry, or a file whose path disagrees with its `id`/`region`.
- Sources: PeriodO (public domain), Wikidata (CC0), Cliopatria (CC BY 4.0), Pleiades (CC BY), DARE (CC BY). Never Seshat (non-commercial licence).

## Queries (`src/lib/data/queries.ts`)

- `activeAt(cultures, year)`: cultures whose outer range contains the year; `certain` when inside the solid part.
- `meanwhile(anchor, cultures)`: 4–6 cards (`MIN_MEANWHILE_CARDS`, `MAX_MEANWHILE_CARDS`), one region at a time, anchor's own region last, deterministic.
- `eventsBetween(cultures, from, to)`, `eventWorld(culture, cultures)`, `toCultureRef`, `defaultPeriod`.
- `load.ts` uses `fs`: call it only from server components and scripts. Pass `CultureRef` / `Culture` props to client components, never whole datasets on pages that don't need them (weak signal).

## i18n and UI rules

- No hard-coded user-facing text in UI or data. UI text lives in `messages/<locale>/<namespace>.json`; namespaces are `common, home, meanwhile, culture, timeline, explainer, map, credits` (`src/i18n/namespaces.ts`). The English file defines the keys and their types; add a key to all three locales. ICU syntax for plurals and numbers.
- Every page, layout and `generateMetadata` under `[locale]` starts with `const locale = await pageLocale(params)`. Link with `Link` from `@/i18n/navigation`, not `next/link`.
- Numbers and years through `Intl` / `src/lib/years.ts`. Show native names beside translated ones with the `lang` attribute set.
- Logical CSS only: `ms-/me-/ps-/pe-/start-/end-/text-start/border-s/rounded-s`. Lint rejects left/right Tailwind classes.
- Nothing from Google: no Google Fonts (lint blocks `next/font/google`), maps, analytics or CDNs. Self-host every asset; the build fails on Google hosts in `out/`. Subset any CJK font.
- Static export: no middleware, cookies, rewrites or server actions. Browser APIs only in effects or `useSyncExternalStore`; wrap every `localStorage` call in try/catch.
- Locale choice is stored under `LOCALE_STORAGE_KEY` (`src/i18n/locales.ts`); the root page reads it before browser languages.

## Ownership (parallel build)

Stay inside your files. If you must touch a shared file, keep the change minimal and additive and report it.

| Agent | Owns |
|---|---|
| data-china | `data/cultures/china/**` |
| data-americas | `data/cultures/south-america/**`, `data/cultures/mesoamerica/**` |
| data-europe | `data/cultures/europe/**` except `rome.json` |
| rome | `data/cultures/europe/rome.json`, `data/borders/**` |
| ui-core | `src/app/[locale]/page.tsx`, `src/app/[locale]/c/**`, `src/app/[locale]/credits/**`; `src/components/{search,meanwhile,culture,explainer,settings}/**`; PWA (manifest, service worker, icons); fonts; messages `common, home, meanwhile, culture, explainer, credits` |
| timeline | `src/app/[locale]/timeline/**`, `src/components/timeline/**`, messages `timeline` |
| rome-map | `src/components/territory-map/**`, `public/geo/**`, messages `map` |
| foundation (shared) | `src/lib/**`, `src/i18n/**`, `src/app/[locale]/layout.tsx`, `src/app/(root)/**`, `src/app/globals.css`, `data/registry.json`, `scripts/**`, config, `package.json` |

Contracts between areas: `CultureEvents` and `CultureStory` take the same props, `{ culture: Culture; eventWorld: EventWorld }`. `ExplainerProvider`/`useExplainer()` (`open(year?)`, `close()`) and `ExplainerTrigger` are rendered by the shared layout. `useSettings()` / `updateSettings()` live in `src/components/settings/use-settings.ts`. Adding a shadcn component (`pnpm dlx shadcn@4.21.0 add <name>`) writes to `src/components/ui/` and may change `package.json`: report both.
