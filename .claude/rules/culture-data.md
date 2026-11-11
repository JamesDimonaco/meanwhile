---
paths:
  - "data/**"
  - "src/lib/data/**"
  - "scripts/validate-data.ts"
  - "scripts/build-borders.ts"
---

# Culture data

JSON, validated by zod in `src/lib/data/schema.ts` (the source of truth for field names). `data/cultures/china/shang.json` and `data/cultures/south-america/inca.json` are the reference files: copy their shape. Add an id to `data/registry.json` before its file.

## Regions

Nine, fixed in `REGIONS` (`src/lib/data/regions.ts`), each with a colour (`--chart-1`..`--chart-9`, `REGION_COLOR`). `globals.test.ts` holds each to 3:1 on the background and apart from every other region and the war red, also under protanopia and deuteranopia. A tenth region needs another colour that passes. A culture's region is where its heartland is, not where its empire reached:

- `middle-east`: Mesopotamia, Anatolia, the Levant, Arabia, Persia, the Caucasus and Central Asia. Georgia and Armenia go here.
- `south-asia`: the Indian subcontinent and Sri Lanka.
- `asia-pacific`: Japan, Korea, Mongolia and the steppe, Southeast Asia, Oceania. China stays its own region.
- `north-america`: North America and the Caribbean. Mexico's Mesoamerican cultures stay in `mesoamerica`.
- `africa`: the whole continent, Egypt included.
- `europe`: includes Byzantium and Russia.

## Fields

- **LocalizedText** `{ en, es?, zh? }`: English required; missing es/zh falls back to English (validation warns). `reviewed: { es, zh }` stays `false` until a native speaker checks that language.
- **Source** `{ citation, url? }`. Every period, phase, event, fact and borders file has `sources`. Events need 2+ independent sources. Write facts in your own words.
- **Culture**: `id` (kebab-case, in the registry), `region`, `wikidataId`, `name`, `nativeName? { text, lang }` (BCP 47), `aliases[]` (search only), `description`, `reviewed`, `periods[]`, `phases[]`, `events[]` (5+), `facts[]` (1+).
- **Period**: `id`, `label?`, `earliestStart`, `latestStart`, `earliestEnd`, `latestEnd`, `sources`, `periodoId?`, `default` (exactly one per culture), `disputed`, `note?`. The bar is solid from `latestStart` to `earliestEnd`. Prefer a PeriodO definition from a major museum or standard reference.
- **Phase**: `id`, `name`, `start`, `end`, `sources`, ordered by start. Rome is one culture with phases kingdom / republic / empire / eastern; Maya likewise.
- **Event**: `id`, `start`, `end?`, `type` (`founding | ruler | invention | conflict | collapse`), `title`, `sources` (2+), `disputed`, `note?`, `place? { name, lat, lon, pleiadesId? }` (required for every event of a culture with a borders file).
- **Fact** (the one vivid line on a meanwhile card): `id`, `text`, `start`, `end`, `sources`, `disputed`.
- Mark anything contested `disputed: true` and say why in `note`.
- **Borders** `data/borders/<id>.json`: snapshots of GeoJSON polygons. A borders file switches the detail page to `CultureStory`. Never edit one by hand: change the config in `scripts/build-borders.ts` and run `pnpm borders <cliopatria_polities_only.geojson> [id ...]`. Cliopatria's BCE years have no year zero; `fromCliopatriaYear` converts them.
- **Heartland** `data/today.json`: 1–3 ISO codes where the heartland lies today, never the largest extent. Every registry id needs one. `NEVER_SHOWN` codes (TW, HK, MO, EH, PS, XK) are rejected: the site must stay reachable in mainland China and neutral elsewhere. England, Scotland and Wales use `GB-ENG`, `GB-SCT`, `GB-WLS` (`NATIONS` in `nations.ts`, a fixed list); never list `GB` beside one. Run `pnpm sync-flags` after adding a code.
- Sources: PeriodO, Wikidata, Cliopatria, Pleiades, DARE. Never Seshat (non-commercial licence).
