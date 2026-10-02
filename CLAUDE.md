@AGENTS.md

# Meanwhile

Answers "I'm looking at this. What else was happening in the world at the same time?" in seconds.
Mobile-first web app for travellers and museum visitors on weak signal, in en / es / zh (Simplified).

## Commands

`pnpm dev` · `pnpm build` (runs `validate-data`, then `next build`, then fails on any Google host in what a browser can receive: `.next/static`, prerendered `.next/server/app` output, `public/`) · `pnpm start` (serves the build; `/api/scan` needs `ANTHROPIC_API_KEY`) · `pnpm typecheck` (`next typegen` first, so `PageProps`/`LayoutProps` exist) · `pnpm test` (vitest) · `pnpm lint` · `pnpm validate-data`.

Before handing work back, run typecheck, test, lint, validate-data, and build if you touched pages.

## Layout

```
data/registry.json                   canonical culture ids + region (add an id here before its file)
data/cultures/<region>/<id>.json     one culture per file; region is the folder
data/borders/<cultureId|warId>.json territory-map snapshots (Rome, the Carolingian and Holy Roman empires, seven Chinese dynasties, Inca, Aztec, Egypt; pre-1800 flagship wars)
data/wars/<id>.json                  one war per file (see Wars)
public/geo/land-<area>.json          Natural Earth land (europe, east-asia, americas, world); LAND in territory-map.tsx maps each region to one; a war with a borders file uses its cultures' region (`warLand`), a pins-only war uses world
data/succession.json                 "before and after in the same place" links (from, to, place, sources)
data/popular.json                    home page starting points, in display order (ids must have a culture file)
data/today.json                      culture id -> present-day countries of its heartland (ISO 3166-1 alpha-2), for flags
public/flags/                        flag-icons SVGs (MIT), only the codes today.json and the wars use; regenerate with pnpm sync-flags
messages/<locale>/<namespace>.json   UI text, one file per namespace per locale
scripts/                             validate-data.ts, check-no-google.ts, build-borders.ts
src/app/(root)/page.tsx              "/" : inline script picks a locale, redirects to /<locale>/
src/app/[locale]/layout.tsx          html, header (scan button, explainer trigger, language switcher), providers
src/app/[locale]/page.tsx            home: scan, search (prefilled from ?q=)
src/app/api/scan/route.ts            POST /api/scan: placard photo in, destination out (the only server code)
src/app/[locale]/c/[id]/page.tsx     Meanwhile screen + culture detail (moment first, detail below)
src/app/[locale]/timeline/page.tsx   world timeline; year in ?year= (astronomical), read client-side
src/app/[locale]/credits/page.tsx    sources and licences
src/app/[locale]/compare/page.tsx    compare 2 cultures (3 from 768px); ids in ?ids=a,b, read client-side
src/app/[locale]/wars/page.tsx       countries with wars: flags, search over countries and wars, continent chips
src/app/[locale]/country/[code]/     one country (lowercase ISO code): its civilisations and wars on one timeline, then a list, oldest first, with what overlapped
src/app/[locale]/war/[id]/page.tsx   one war: dates, phases, sides, account, map and events, leaders, deaths, links back (share image: opengraph-image.tsx, gated like the page)
src/app/culture-data/[file]/route.ts static /culture-data/<id>.json per culture: what compare fetches
src/i18n/                            locales, routing, navigation, request config, pageLocale()
src/lib/years.ts                     all year maths and formatting
src/lib/scan/                        model answer -> destination, upload checks, catalogue prompt, rate limit, the model call
src/lib/data/                        schema.ts (zod + types), load.ts (fs; build-time, except the scan route's unvalidated catalogue read), queries.ts, localize.ts, validate.ts; wars: war-schema.ts, validate-wars.ts, wars.ts (queries, review gate), country.ts (country pages, overlap, locale gaps), countries.ts (UN members, never-shown codes), contested.ts (pin guard, server only)
src/components/filters/              region chips + filter state (?regions= on the timeline, localStorage elsewhere)
src/components/identity/             HeartlandFlags, CountryFlag, CountryLink (flag + name linking to the country page), RegionDot
src/components/wars/                 WarRow, SideList, WarDates, WarBar (phase bar), Casualties, CountryList
src/components/country/              CountryTimeline (on TimelineChart), CountryItemCard
src/components/<area>/               see Ownership
src/components/ui/                   shadcn components (base-nova, RTL-aware)
```

## Years

- Stored as signed integers, **astronomical numbering**: 1 CE = 1, 1 BCE = 0, 2 BCE = -1, 1200 BCE = -1199. Convert only on display, via `src/lib/years.ts`. There is no year zero on screen.
- Display: `formatYear` / `formatYearRange` (era labels per locale: en BCE/CE, es "a. e. c."/"e. c.", zh 公元前/公元; BC/AD style optional). In components use `<YearText year>` / `<YearRangeText start end>` from `src/components/settings/year-text.tsx` so every date gets the same era style, years-ago toggle and first-BCE explainer.
- `yearsAgo(year, currentYear())` and `roundYearsAgo`. Call `currentYear()` on the client: pages are prerendered, so server code runs at build time and would freeze the year.
- Parsing: `parseYearQuery` for what people type ("1200 BCE", "公元前1200年", "1200 a. C.", "AD 500"). A bare number is CE; a leading minus is BCE the human way ("-1200" = 1200 BCE = -1199). `parseYearParam` for `?year=`, which is the raw astronomical integer (`?year=-1199` = 1200 BCE).

## Data format

JSON, validated by zod in `src/lib/data/schema.ts` (the source of truth for field names). `data/cultures/china/shang.json` and `data/cultures/south-america/inca.json` are the reference files: copy their shape.

- **LocalizedText** `{ en, es?, zh? }`: English required; missing es/zh falls back to English (validation warns). `reviewed: { es, zh }` on each culture is `false` until a native speaker checks that language (machine-translated until then).
- **Source** `{ citation, url? }`. Every period, phase, event, fact and borders file has `sources: Source[]`. Events need at least 2 independent sources. Write facts in your own words; never copy source wording.
- **Culture**: `id` (kebab-case, in the registry), `region` (`china | south-america | mesoamerica | europe | africa`), `wikidataId` (`Q…`), `name`, `nativeName? { text, lang }` (BCP 47 lang, e.g. `zh-Hans`, `qu`), `aliases[]` (search-only terms: pinyin, other spellings), `description`, `reviewed`, `periods[]`, `phases[]`, `events[]` (at least 5), `facts[]` (at least 1).
- **Period**: `id`, `label?`, `earliestStart`, `latestStart`, `earliestEnd`, `latestEnd`, `sources`, `periodoId?` (e.g. `p08m57h9sf6`), `default` (exactly one per culture), `disputed`, `note?`. The bar is solid from `latestStart` to `earliestEnd` and fades across the outer edges. Prefer a PeriodO definition from a major museum or standard reference (https://data.perio.do/d.json).
- **Phase** (segments of one bar): `id`, `name`, `start`, `end`, `sources`, ordered by start. Rome is one culture `rome` with phases kingdom / republic / empire / eastern; Maya is one culture `maya` with phases preclassic / classic / postclassic.
- **Event**: `id`, `start`, `end?`, `type` (`founding | ruler | invention | conflict | collapse`), `title`, `sources` (2+), `disputed`, `note?`, `place? { name, lat, lon, pleiadesId? }` (required for every event of a culture with a borders file: the map pins it).
- **Fact** (the "one vivid line" on a meanwhile card): `id`, `text`, `start`, `end`, `sources`, `disputed`.
- Mark anything contested `disputed: true` and say why in `note`.
- **Borders** `data/borders/<cultureId>.json` (or `<warId>.json`): `{ cultureId | warId, sources, snapshots: [{ year, polities: [{ id, label, role: "self" | "rival", geometry }] }] }`, snapshots in ascending year. `geometry` is GeoJSON `Polygon` or `MultiPolygon`, `[lon, lat]`, simplified before committing. A borders file makes `hasTerritoryMap(id)` true, which swaps the detail page to `CultureStory` and serves it at `/geo/borders/<id>.json`. Never edit one by hand: add or change the culture's config in `scripts/build-borders.ts` and run `pnpm borders <cliopatria_polities_only.geojson> [id ...]` (the script's header says where to download Cliopatria; the dataset stays out of the repo). Cliopatria's BCE years have no year zero; the script converts them with `fromCliopatriaYear`.
- **Heartland** `data/today.json`: `{ "<id>": ["PE"] }`, 1–3 codes, where the heartland lies today, never the largest extent. Every registry id needs an entry. Disputed or politically loaded codes (TW, HK, MO, EH, PS, XK; `NEVER_SHOWN` in `countries.ts`) are rejected: the site must stay reachable in mainland China and neutral elsewhere. After adding a code, run `pnpm sync-flags`.
- Validation fails on schema errors, duplicate ids, missing English, ids missing from the registry, a file whose path disagrees with its `id`/`region`, or a heartland/flag mismatch.
- Sources: PeriodO (public domain), Wikidata (CC0), Cliopatria (CC BY 4.0), Pleiades (CC BY), DARE (CC BY). Never Seshat (non-commercial licence).

## Wars

A Wars tab (footer, beside Timeline): pick a present-day country, open its country page, open a war. Every war links back into the timeline, culture pages and meanwhile cards. `data/wars/spanish-conquest-of-the-aztec-empire.json` is the reference file: copy its shape. `src/lib/data/war-schema.ts` is the source of truth for field names.

### File shape (`data/wars/<id>.json`, id = file name, kebab-case)

| Field | What |
|---|---|
| `id`, `wikidataId` | `Q…` of the war item itself (never a disambiguation page) |
| `name` | `{ en, es, zh }`, all three required: each language's own Wikipedia title (en-wiki, es-wiki, zh-wiki in zh-cn). Never invent a title; where a Wikipedia has no article, see "Titles" under Open calls |
| `noWikiTitle[]` | `["es"]`, `["zh"]` or both: the languages whose Wikipedia has no article on this war, so their `name` is ours. Omit when every title is a Wikipedia title |
| `aliases[]` | search-only terms, any language |
| `altNames[]` | `{ text, lang, usedBy, gloss? }`: a side's own name for the war, shown as "<usedBy> calls it <text>" and searchable, never the title. E.g. `{ "text": "抗美援朝战争", "lang": "zh-Hans", "usedBy": { "en": "China", … }, "gloss": { "en": "War to Resist US Aggression and Aid Korea", … } }` |
| `description` | the short account, 80–200 words, in our own words |
| `outcome` | one neutral line |
| `tier` | `flagship` (2+ phases, 15–30 events) or `standard` (3–8 events); events include culture event references |
| `sensitive`, `reviewed: { es, zh }` | see the review gate. Every war on the sensitive list must say `"sensitive": true`. `reviewed` is always `{ "es": false, "zh": false }` in a file you write: only James sets a language true, after listing it in `src/lib/data/war-review.ts` |
| `period` **or** `ongoing` | ended: a Period (`id`, `earliestStart`, `latestStart`, `earliestEnd`, `latestEnd`, `sources`, `disputed`, `note?`). Ongoing: `{ earliestStart, latestStart, asOf: "YYYY-MM-DD", sources, disputed?, note? }`, no end; `asOf` is the day you checked, never a future date |
| `sides[]` | 2+ of `{ id, label, members[] }`. A member is `{ kind: "culture", id }` (registry id, linked), `{ kind: "state", code }` (a UN member today, drawn with its flag) or `{ kind: "polity", name }` (a historical polity, army or company: plain name, no flag), each with `role: "belligerent" \| "supporter"` and `today: ["MX"]`, 1–3 ISO codes of the present-day countries whose pages list the war for that member |
| `phases[]` | flagship: segments of one bar, `{ id, name, start, end, sources }`, by start, whole calendar years (a phase inside one year is `1519`–`1519`), inside the war's outer period |
| `events[]` | `{ id, start, end?, title, sources (2+), disputed?, note?, place: { name, lat, lon }, wikidataId? }`, or `{ culture, event }`: a culture's own event shown by reference (the Aztec war lists `aztec`'s `fall-of-tenochtitlan` last). Every event is a pin. List them, references included, in the order they happened: within a year, file order is display order. A referenced culture event needs a `place`; if it has none, write your own event with the same sources rather than editing the culture file |
| `leaders[]` | `{ name, side, role, wikidataId }`; `side` is one of this war's side ids |
| `casualties[]` | `{ scope, side?, who?, low, high, attributedTo?, asOf?, sources, note? }`, scope `battle-deaths \| military-deaths \| civilian-deaths \| total-deaths`. `who` names the part of the side a figure counts (`{ "en": "Spaniards", … }`) and replaces the side's label in the heading. Figures with the same scope, side and `who` sit together as rival estimates of one quantity, so each must count the same people over the same span: a war-wide range and one battle's toll never share a group (the battle's toll goes in that event's `note`) |
| `cultures[]` | culture ids this war ended or changed: their pages list it |
| `follows?` | an earlier war this one continues or grows out of (French conquest of Vietnam → First Indochina War → Vietnam War; the Russo-Ukrainian war → its full-scale phase from 2022). Shown as "Began before this one" / "Began after this one" links |
| `sources[]` | the war's own references |

```json
{
  "id": "falklands-war",
  "wikidataId": "Q…",
  "name": { "en": "Falklands War", "es": "Guerra de las Malvinas", "zh": "福克兰战争" },
  "aliases": ["Malvinas", "Guerra del Atlántico Sur", "马岛战争"],
  "altNames": [],
  "description": { "en": "…", "es": "…", "zh": "…" },
  "outcome": { "en": "…", "es": "…", "zh": "…" },
  "tier": "standard",
  "sensitive": true,
  "reviewed": { "es": false, "zh": false },
  "period": { "id": "war", "earliestStart": 1982, "latestStart": 1982, "earliestEnd": 1982, "latestEnd": 1982, "sources": [{ … }] },
  "sides": [
    { "id": "united-kingdom", "label": { "en": "United Kingdom", … }, "members": [{ "kind": "state", "code": "GB", "role": "belligerent", "today": ["GB"] }] },
    { "id": "argentina", "label": { "en": "Argentina", … }, "members": [{ "kind": "state", "code": "AR", "role": "belligerent", "today": ["AR"] }] }
  ],
  "events": [{ "id": "…", "start": 1982, "title": { … }, "sources": [{ … }, { … }], "place": { "name": { … }, "lat": …, "lon": … } }],
  "casualties": [{ "scope": "military-deaths", "side": "argentina", "low": …, "high": …, "sources": [{ … }] }],
  "sources": [{ "citation": "…", "url": "…" }]
}
```

(Shape only: every `…` is yours to research; nothing here is a fact to copy. Years are astronomical like everywhere else: 499 BCE is `-498`. Check every BCE value, including in phases and events.)

### Validation (`pnpm validate-data`, `src/lib/data/validate-wars.ts`)

Fails on: schema errors (including a missing es or zh title, an event with fewer than 2 sources or no place, a casualty without sources, `high < low`, or a single number `low == high` without `attributedTo`); a war on the sensitive list without `"sensitive": true`; `reviewed.es` or `reviewed.zh` true without James's entry in `war-review.ts`; an ongoing war's or a casualty's `asOf` after the build date (taken in UTC+14, so today's date anywhere passes); an ongoing war that starts after its `asOf` year; the wrong number of events for the tier, or a flagship with fewer than 2 phases; duplicate war ids; a file name that isn't its id; a war id that is also a culture id; a culture id in a side or `cultures[]` that is not in the registry or has no culture file; a missing or missing-place culture event reference; `follows` naming a missing war or one that starts later; a `today` or state code that is not a UN member state or is never shown (TW, HK, MO, EH, PS, XK); an event or phase outside the war's outer period (`earliestStart` to `latestEnd`, or to the `asOf` year); a borders file for a standard-tier war or one that ends after 1800; a pin inside a contested area. Missing es/zh in other text only warns.

Not caught: a BCE war shifted by one year throughout (period and events entered as `-499`…`-449` for 499–449 BCE) is self-consistent and passes. The reviewer checks every BCE value against the sources and Wikidata's start and end (P580/P582).

### Decisions (James, 2026-10-01)

1. **Country list**: UN member states only (`UN_MEMBERS` in `countries.ts`, grouped by UN M49 region), never TW, HK, MO, EH, PS or XK.
2. **Titles**: each language's own Wikipedia title. Each side's own name goes in `altNames` (attributed, searchable), never the title.
3. **Russia 2022 in zh**: draft with the zh-wiki wording; it sits behind the review gate, and James decides the wording at review.
4. **Not in v1**: Tibet 1950–51, the Taiwan Strait crises, the Paracels and Spratlys, the Dzungar campaigns, Gaza 2023–. Don't write them.
5. **Casualties**: official and independent figures side by side, attributed, in every language.
6. **Maps**: polygons only for flagship wars that end before 1800 (Cliopatria via `pnpm borders`). Every other war: pins on plain world land. No country borders, no front lines, no polygons.
7. **Falklands**: en "Falklands War", es "Guerra de las Malvinas", zh 福克兰战争.
8. **Ongoing wars**: `ongoing` with an `asOf` date shown on screen; figures re-checked by hand each quarter.
9. **Review gate**: a `sensitive` war whose `reviewed.es` / `reviewed.zh` is false does not exist in that language: no page, no row, bar or year-panel entry on a country page, no culture-page row, no search hit, no sitemap entry, no before/after link, and the language switcher sends that language to the wars list instead (a page in that language never carries the war's id). English always shows. `isShownIn` / `warsShownIn` in `wars.ts` are the only way in; pages get wars through `loadWars(locale)`, which applies them. `loadAllWars()` (every war, ungated) is for the sitemap, locale gaps, the borders route, scripts and tests only, and a test fails if any other page or component reads it. Sensitive in v1 (`SENSITIVE_WARS` in `war-review.ts`, which only James edits): `korean-war`, `second-sino-japanese-war` (incl. Nanjing), `vietnam-war`, `russo-ukrainian-war`, `russo-ukrainian-war-2022`, `falklands-war`. Signing a language off takes both James's `REVIEWED` entry there and the file's `reviewed` flag.
10. **Opium Wars**: two files, `first-opium-war` (Q191282) and `second-opium-war` (Q418151, `follows: "first-opium-war"`), both flagship, pins only. Wikidata's "Opium Wars" (Q220984) is a series of wars with a 14-year gap, not one war.

### Open calls (defaults until James decides, 2026-10-02)

These follow the decisions above where they reach; James may change them at review.

- **Titles where a Wikipedia has no article.** Use Wikidata's label in that language (zh: the zh-cn or zh-hans label); with no label, translate the en-wiki title word for word. List the language in `noWikiTitle`. Known cases: `french-conquest-of-vietnam` (Q10747195, en article only: es and zh), `mongol-conquest-of-the-song` (Q400061, no es article: es). Prose still follows the "conquest" rule below.
- **British India is several wars, not one.** No war item or title exists for a "British conquest of India" (it redirects to Company rule in India, Q2001966, a period), and the Anglo-Maratha (Q2776612) and Anglo-Sikh (Q2285589) items are disambiguation pages. So the wars-india track writes the numbered wars that have their own items: the four numbered Anglo-Mysore wars (`first-` to `fourth-anglo-mysore-war`; the series item Q617321 has no es article), `first-anglo-maratha-war`, `second-anglo-maratha-war`, `third-anglo-maratha-war`, `first-anglo-sikh-war`, `second-anglo-sikh-war` and `indian-rebellion-of-1857` (Q129864, flagship, pins only). Plassey (1757) is left out of v1: its item (Q203233) has no P361, so no war item contains it. Decided by Claude on 2026-10-02 because James said "build it"; he may change it at review.
- **Russia and Ukraine, two entries, both `ongoing`.** `russo-ukrainian-war` is the whole war from 20 February 2014 (Q15860072): en "Russo-Ukrainian war", es "Conflicto ruso-ucraniano (2014-presente)", zh 俄乌战争. Its events stop before 24 February 2022, and its UCDP range sums conflicts 13246 (Donetsk), 13247 (Lugansk) and 13306 (Novorossiya) for 2014–2021, `asOf` 2021-12-31, with a note that later deaths are counted on the full-scale entry. `russo-ukrainian-war-2022` is the full-scale war from 24 February 2022 (Q110999040): en "Russo-Ukrainian war (2022–present)", es "Guerra ruso-ucraniana", zh 俄乌战争 (2022年至今) (zh-wiki moved away from 俄罗斯入侵乌克兰, so the plan's 入侵 wording is stale). The id avoids "invasion" because the en and zh titles do; the prose may say "full-scale invasion" in en and es as their Wikipedia leads do, and the zh prose follows zh-wiki's wording (the war is behind the review gate, so James settles the zh wording at review). UCDP conflict 13243, 2022 onwards. It `follows` the 2014 entry, shown as "Began before this one". Check every title on the day you write it; these move.
- **Pins in disputed places outside the guard.** The guard covers the places China claims or disputes with a neighbour. Elsewhere (the Falklands, Crimea, Donbas, Gaza, the Kurils) a battle is pinned where it happened, because the basemap draws no borders and a pin names no country. Name the place as each language's Wikipedia titles it.

### Editorial rules

- **Same facts in every language.** Dates, sides, outcomes and tolls are identical in en, es and zh; only names and phrasing change.
- **Physical verbs**: attacked, crossed, besieged, took, withdrew, signed, killed. Never liberated, pacified, recovered, discovered, defended.
- "Conquest" and "invasion" only where all three Wikipedias use the word in the title. Official euphemisms only as attributed quotes.
- **Name the exact actors** ("East India Company forces" before 1858, "Chinese People's Volunteer Army") and every outside supporter, including local allies in colonial conquests (Tlaxcala in the Aztec war). Use `role: "supporter"` only where the sources say a party supplied rather than fought.
- **Sides, not verdicts**: no aggressor/victim fields or wording; no winner declared where the sources don't agree on one.
- **Casualties**: a sourced range, or a figure attributed to whoever gives it. Never a bare number, never only the low end of a contested toll. Say it is contested in `note` when it is. Label UCDP figures `battle-deaths`. Describe each figure as its source does: if the source says "the campaign overall", the note doesn't say "the siege". A source that counts something narrower (one battle, one month) gets its own figure or goes in a note, never into another quantity's range.
- **Massacres and atrocities**: plain, sourced, non-graphic wording, like a museum label.
- Mark contested dates and names `disputed: true` with a `note`.
- **Two independent sources per fact**, written in our own words; open every source you cite.
- **Pins**: battle sites and cities only, never inside a contested area. The guard (`contested.ts`, server only) rejects Taiwan, Penghu and Taiwan's northern islets, Kinmen (with Dadan, Erdan, Wuqiu and Dongding), Matsu, the Pratas Islands, Kashmir and Aksai Chin (with Ladakh down to Hanle, Chumar and Demchok), Gilgit-Baltistan, Arunachal Pradesh, the Paracels, the Spratlys (with the Luconia Shoals and James Shoal), Scarborough Shoal and the Senkaku/Diaoyu Islands; pin the nearest undisputed city instead. Other disputed places: see Open calls. The boxes are coarse: a reviewer still checks every pin.

### Maps

- Pre-1800 flagship: add the war to `WARS` in `scripts/build-borders.ts` (same shape as a culture config; `self` = the polities whose lands the war was fought over, drawn red and named in the caption; `rivals` = neighbours, grey; cut with `extent`), add any new polity name to `LABELS`, then `pnpm borders <cliopatria_polities_only.geojson> <war-id>`. Cliopatria's BCE years are converted by `fromCliopatriaYear`; still check the snapshot years. Never edit the output by hand.
- Everything else: no borders file. The page draws every event pin on `public/geo/land-world.json` and fits the frame to them.

### Sources

- **UCDP** (CC BY 4.0), 1946 onwards: `UcdpPrioConflict_v26_1.csv` (conflicts, dates, sides) and `BattleDeaths_v26_1_conf.csv` (battle deaths 1989–2025, with `brd_codebook.txt`) in `../wars-sources`. A war's range: take every row of its `conflict_id` in the battle-deaths file for the years the war covers and sum `bd_low` and `bd_high` separately (e.g. conflict 13243, Russia–Ukraine, 2022–2025: 311,869–575,370). Scope `battle-deaths` (combatants and civilians killed in battle, not all deaths); `asOf` = the last day of the last year summed. Cite "Davies, S., Pettersson, T. & Öberg, M. (2026). Organized violence 1989–2025, and violent political protests. Journal of Peace Research 63(4); UCDP Battle-Related Deaths Dataset v26.1, CC BY 4.0" with https://ucdp.uu.se/downloads/.
- **Correlates of War** (`interstate.csv`, `extrastate.csv`, `intrastate.csv` in `../wars-sources`), 1816–2007: cross-check dates and sides only. Its licence forbids redistribution: never commit the CSVs or any table derived from them; cite individual facts only.
- **Brecke Conflict Catalog** (`conflict_catalog.xlsx`), 1400–1816: finding candidate wars and dates. Self-described as unfinished: verify every row elsewhere before using it.
- **Wikidata** (CC0): ids, names in three languages, coordinates. Assign sides by hand (its participant lists mix sides and contain errors) and never use its death tolls.
- **Britannica, World History Encyclopedia, Encyclopedia.com reference works, academic histories**: the account and anything ancient.
- Never Seshat (non-commercial) or PRIO Battle Deaths (frozen at 2008, replaced by UCDP).

### Checklist for a new war

1. Write `data/wars/<id>.json`; every `today` code a UN member.
2. `pnpm sync-flags` if a new country code appears (the only way `public/flags/` changes).
3. Pre-1800 flagship only: `WARS` config + `pnpm borders`.
4. `pnpm validate-data`, `pnpm test`, then look at `/en/war/<id>/` and `/zh/war/<id>/` (a sensitive war has no zh page until James reviews it: check `/en/` only).
5. BCE wars: check every year against the sources and Wikidata P580/P582 by hand; validation can't see a consistent off-by-one.

## Country pages

`/[locale]/country/<code>/` exists in a language when a civilisation's heartland (`data/today.json`) or a war shown in that language (`loadWars(locale)`) lists the country: UN members only, never a `NEVER_SHOWN` code. A country whose only entries are gated wars has an English page only; `localeGaps` keeps the language switcher and sitemap off the missing ones. Flags outside another link (war sides, the culture page's heartland line) are `CountryLink`s; a test checks every listable heartland and war-state code has a page wherever it shows.

- **Overlap**: two items overlap when their solid spans (`latestStart`..`earliestEnd`; a war's period the same way, an ongoing war solid to its `asOf` year) share at least one year, so fuzzy edges alone never join consecutive dynasties (Qin and Han don't overlap).
- **Timeline**: `TimelineChart` (`src/components/timeline/timeline-chart.tsx`) is the machinery the world timeline and the country timeline share: year bar and zoom, frozen name column, scrolling axis, draggable year line. `useYearParam` keeps `?year=`. A country's chart opens fitted to its span (`fit`, never zooming out past it); every bar is at least `MIN_BAR_WIDTH` wide with a `BAR_HIT_WIDTH` tap target and opens its page. Wars are drawn in `--war` (`globals.css`, light and dark).
- **Payload**: the client gets `TimelineBar`s only (id, name, region, years, phases, `asOf`); the list cards render on the server. `client-payloads.test.ts` checks both and the gate.

## Queries (`src/lib/data/queries.ts`)

- `activeAt(cultures, year)`: cultures whose outer range contains the year; `certain` when inside the solid part.
- `meanwhile(anchor, cultures)`: 4–6 cards (`MIN_MEANWHILE_CARDS`, `MAX_MEANWHILE_CARDS`), one region at a time, anchor's own region last, deterministic. It is `pickMeanwhile(meanwhileCandidates(...))`; the culture page sends the light candidates to the client so the region filter can re-pick.
- `meanwhileAtYear(year, cultures, exclude)`: the same candidates and cards for one year (a war's start); `pickMeanwhile(candidates, null)` when there is no anchor region.
- `eventsBetween(cultures, from, to)`, `eventWorld(culture, cultures)`, `toCultureRef`, `defaultPeriod`.
- Wars (`wars.ts`): `isShownIn` / `warsShownIn` (the review gate), `warsForCulture`, `countryIndex`, `warOuter`, `warSpan`.
- Countries (`country.ts`): `countryCodes` (who gets a country page in a language), `countryItems`, `overlaps` / `overlapping`, `localeGaps`, `gapsOnPagesIn`.
- `load.ts` uses `fs`: call it only from server components and scripts. Pass `CultureRef` / `Culture` props to client components, never whole datasets on pages that don't need them (weak signal).

## i18n and UI rules

- No hard-coded user-facing text in UI or data. UI text lives in `messages/<locale>/<namespace>.json`; namespaces are `common, home, meanwhile, culture, timeline, explainer, map, credits, context, compare, scan, wars, country` (`src/i18n/namespaces.ts`). The English file defines the keys and their types; add a key to all three locales. ICU syntax for plurals and numbers.
- Every page, layout and `generateMetadata` under `[locale]` starts with `const locale = await pageLocale(params)`. Link with `Link` from `@/i18n/navigation`, not `next/link`.
- Numbers and years through `Intl` / `src/lib/years.ts`. Show native names beside translated ones with the `lang` attribute set.
- Logical CSS only: `ms-/me-/ps-/pe-/start-/end-/text-start/border-s/rounded-s`. Lint rejects left/right Tailwind classes.
- Nothing from Google: no Google Fonts (lint blocks `next/font/google`), maps, analytics or CDNs. Self-host every asset; the build fails on Google hosts in the built output. Subset any CJK font.
- Hosting: Next on Vercel, function region `iad1` (`vercel.json`; Anthropic doesn't serve mainland China or Hong Kong, so never `hkg1`). Every page and the `geo/` and manifest route handlers are prerendered (`generateStaticParams`, `force-static`); check the build's route table keeps them `○`/`●`. The only server code is `POST /api/scan`. No middleware, cookies, rewrites or server actions. Browser APIs only in effects or `useSyncExternalStore`; wrap every `localStorage` call in try/catch.
- Locale choice is stored under `LOCALE_STORAGE_KEY` (`src/i18n/locales.ts`); the root page reads it before browser languages.

## Placard scanning

- `POST /api/scan/` takes a JPEG/PNG/WebP body (2 MB cap, magic bytes checked; the client downscales to 1280px JPEG first) and makes one `claude-opus-5` call (low effort, JSON-schema output). The schema limits `cultureId` to catalogue ids or null; BCE/CE years become astronomical in `decideScan`, never in the model. Low confidence never routes.
- Key: `ANTHROPIC_API_KEY` in the server env only. Without it the route answers 503 and the UI says scanning is unavailable.
- Images are never stored or logged; the log line is model, stop reason, latency and token counts only.
- Rate limits are in memory per function instance (30 per IP per 10 min, 120 in total per hour): they reset on a cold start and aren't shared across instances. `max_tokens` is 1024 (a normal scan uses about 100). None of this is a hard spend ceiling: the key needs its own Console workspace with a monthly limit.
- Live check: `src/lib/scan/__fixtures__/placard-*.jpg` (Shang in Chinese, Rome in English, Moche in Spanish, and a placard that tries to give the model instructions). POST one with `curl --data-binary @file -H 'content-type: image/jpeg'` to a local `next start` that has the key.

## Ownership (parallel build)

Stay inside your files. If you must touch a shared file, keep the change minimal and additive and report it. Wars tracks need no shared file: `public/flags/` changes come only from `pnpm sync-flags`, and only wars-ancient edits `scripts/build-borders.ts`.

| Agent | Owns |
|---|---|
| data-china | `data/cultures/china/**` |
| data-americas | `data/cultures/south-america/**`, `data/cultures/mesoamerica/**` |
| data-europe | `data/cultures/europe/**` except `rome.json` |
| rome | `data/cultures/europe/rome.json`, `data/borders/**` |
| ui-core | `src/app/[locale]/page.tsx`, `src/app/[locale]/c/**`, `src/app/[locale]/credits/**`; `src/components/{search,meanwhile,culture,explainer,settings}/**`; PWA (manifest, service worker, icons); fonts; messages `common, home, meanwhile, culture, explainer, credits` |
| timeline | `src/app/[locale]/timeline/**`, `src/components/timeline/**`, messages `timeline` |
| rome-map | `src/components/territory-map/**`, `public/geo/**`, messages `map` |
| compare | `src/app/[locale]/compare/**`, `src/app/culture-data/**`, `src/components/compare/**`, messages `compare` |
| wars-ancient | `data/wars/{greco-persian-wars,peloponnesian-war,qin-wars-of-unification,punic-wars,gallic-wars,han-xiongnu-war,mongol-conquest-of-the-song,fall-of-constantinople}.json`, `data/borders/punic-wars.json`, the `WARS` entries (and their `LABELS`) in `scripts/build-borders.ts`. punic-wars is flagship with a Cliopatria map |
| wars-conquest | `data/wars/{spanish-conquest-of-the-inca-empire,spanish-conquest-of-yucatan,first-opium-war,second-opium-war,mexican-american-war}.json`. Both Opium Wars are flagship, pins only |
| wars-india | `data/wars/{first-anglo-mysore-war,second-anglo-mysore-war,third-anglo-mysore-war,fourth-anglo-mysore-war,first-anglo-maratha-war,second-anglo-maratha-war,third-anglo-maratha-war,first-anglo-sikh-war,second-anglo-sikh-war,indian-rebellion-of-1857}.json` (see Open calls). indian-rebellion-of-1857 is flagship, pins only |
| wars-asia-20c | `data/wars/{french-conquest-of-vietnam,first-indochina-war,vietnam-war,korean-war,second-sino-japanese-war,soviet-afghan-war}.json`. The first three are flagship, one story linked by `follows` |
| wars-modern | `data/wars/{world-war-i,world-war-ii,iran-iraq-war,falklands-war,gulf-war,war-in-afghanistan-2001,iraq-war,russo-ukrainian-war,russo-ukrainian-war-2022}.json`. The last two are `ongoing`; russo-ukrainian-war-2022 `follows` russo-ukrainian-war |
| James only | `src/lib/data/war-review.ts` (the sensitive list and review sign-offs) |
| country | `src/app/[locale]/country/**`, `src/components/country/**`, messages `country` |
| foundation (shared) | `src/lib/**` except `war-review.ts`, `src/i18n/**`, `src/app/[locale]/layout.tsx`, `src/app/(root)/**`, `src/app/globals.css`, `data/registry.json`, `scripts/**`, config, `package.json` |

Contracts between areas: `CultureEvents` and `CultureStory` take the same props, `{ culture: Culture; eventWorld: EventWorld }`. `ExplainerProvider`/`useExplainer()` (`open(year?)`, `close()`) and `ExplainerTrigger` are rendered by the shared layout. `useSettings()` / `updateSettings()` live in `src/components/settings/use-settings.ts`. Adding a shadcn component (`pnpm dlx shadcn@4.21.0 add <name>`) writes to `src/components/ui/` and may change `package.json`: report both.
