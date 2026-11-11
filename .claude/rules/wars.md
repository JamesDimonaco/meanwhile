---
paths:
  - "data/wars/**"
  - "data/borders/**"
  - "src/lib/data/war*.ts"
  - "src/lib/data/validate-wars.ts"
  - "src/lib/data/contested.ts"
  - "scripts/build-borders.ts"
  - "scripts/build-land.ts"
---

# Writing a war

`data/wars/spanish-conquest-of-the-aztec-empire.json` is the reference file: copy its shape. `src/lib/data/war-schema.ts` is the source of truth for field names. Every war links back into the timeline, culture pages and meanwhile cards.

## File shape (`data/wars/<id>.json`, id = file name, kebab-case)

| Field | What |
|---|---|
| `id`, `wikidataId` | `Q…` of the war item itself (never a disambiguation page) |
| `name` | `{ en, es, zh }`, all three required: each language's own Wikipedia title (en-wiki, es-wiki, zh-wiki in zh-cn). Never invent a title. Check every title on the day you write it; they move |
| `noWikiTitle[]` | `["es"]`, `["zh"]` or both: languages whose Wikipedia has no article, so their `name` is ours (Wikidata's label in that language, zh-cn or zh-hans; with no label, translate the en-wiki title word for word). Omit when every title is a Wikipedia title |
| `aliases[]` | search-only terms, any language |
| `altNames[]` | `{ text, lang, usedBy, gloss? }`: a side's own name for the war, shown as "<usedBy> calls it <text>" and searchable, never the title |
| `description` | the short account, 80–200 words, in our own words |
| `outcome` | one neutral line |
| `tier` | `flagship` (2+ phases, 15–30 events) or `standard` (3–8 events); events include culture event references |
| `sensitive`, `reviewed: { es, zh }` | see Review gate. `reviewed` is always `{ "es": false, "zh": false }` in a file you write |
| `period` **or** `ongoing` | ended: a Period (`id`, `earliestStart`, `latestStart`, `earliestEnd`, `latestEnd`, `sources`, `disputed`, `note?`). Ongoing: `{ earliestStart, latestStart, asOf: "YYYY-MM-DD", sources, disputed?, note? }`, no end; `asOf` is the day you checked, never a future date |
| `sides[]` | 2+ of `{ id, label, members[] }`. A member is `{ kind: "culture", id }` (registry id), `{ kind: "state", code }` (a UN member today, drawn with its flag) or `{ kind: "polity", name }` (historical polity, army or company: no flag), each with `role: "belligerent" \| "supporter"` and `today: ["MX"]`, 1–3 ISO codes of the present-day countries whose pages list the war. A war fought in Britain uses the nation codes where it was fought (`GB-SCT`), whatever the year; a war the UK fought abroad uses `GB` |
| `phases[]` | flagship: segments of one bar, `{ id, name, start, end, sources }`, by start, whole calendar years, inside the outer period. A standard war may carry them where the sources split it into named parts |
| `events[]` | `{ id, start, end?, title, sources (2+), disputed?, note?, place: { name, lat, lon }, wikidataId? }`, or `{ culture, event }`: a culture's own event by reference. Every event is a pin. List them in the order they happened: within a year, file order is display order. A referenced culture event needs a `place`; if it has none, write your own event with the same sources rather than editing the culture file |
| `leaders[]` | `{ name, side, role, wikidataId }`; `side` is one of this war's side ids |
| `casualties[]` | `{ scope, side?, who?, low, high, attributedTo?, asOf?, sources, note? }`, scope `battle-deaths \| military-deaths \| civilian-deaths \| total-deaths`. `who` names the part of the side a figure counts. Figures with the same scope, side and `who` are rival estimates of one quantity, so each must count the same people over the same span: one battle's toll goes in that event's `note` |
| `cultures[]` | culture ids this war ended or changed: their pages list it |
| `follows?` | an earlier war this one continues or grows out of; shown as "Began before this one" / "Began after this one" |
| `sources[]` | the war's own references |

Years are astronomical like everywhere else: 499 BCE is `-498`. Check every BCE value, including phases and events.

## Validation (`pnpm validate-data`, `validate-wars.ts`)

It catches schema errors, missing es/zh titles, events with under 2 sources or no place, casualties without sources, `high < low`, `low == high` without `attributedTo`, a sensitive war without `"sensitive": true`, `reviewed` true without James's entry, `asOf` after the build date (UTC+14), wrong event count for the tier, bad ids and references, `follows` pointing later, `today`/state codes that aren't UN members or UK nations or are never shown, events or phases outside the outer period, borders on a standard war or one ending after 1800, and pins in contested areas.

Not caught: a BCE war shifted by one year throughout is self-consistent and passes. Check every BCE year against the sources and Wikidata P580/P582 by hand.

## Decisions (James, 2026-10-01)

- **Country list**: UN members only (`UN_MEMBERS` in `countries.ts`), never TW, HK, MO, EH, PS or XK.
- **Titles**: each language's Wikipedia title. A side's own name goes in `altNames`, never the title.
- **Not in v1**: Tibet 1950–51, the Taiwan Strait crises, the Paracels and Spratlys, the Dzungar campaigns, Gaza 2023–. Don't write them.
- **Casualties**: official and independent figures side by side, attributed, in every language.
- **Maps**: polygons only for flagship wars that end before 1800. Every other war: pins on plain land. No borders, no front lines.
- **Ongoing wars**: `ongoing` with an `asOf` date shown on screen; figures re-checked by hand each quarter.
- **Opium Wars**: two files, `first-opium-war` (Q191282) and `second-opium-war` (Q418151, `follows` the first). Wikidata's "Opium Wars" (Q220984) is a series, not one war.
- **British India**: no single war item exists, so write the numbered wars with their own items (Anglo-Mysore, Anglo-Maratha, Anglo-Sikh, `indian-rebellion-of-1857`). Plassey is out of v1 (Q203233 has no P361).
- **Russia 2022 in zh**: draft with zh-wiki wording; James settles it at review.

## Review gate

`src/lib/data/war-review.ts` (`SENSITIVE_WARS`, `REVIEWED`) is James's file only. Never edit it.

A `sensitive` war whose `reviewed.es` / `reviewed.zh` is false does not exist in that language: no page, row, bar, search hit, sitemap entry or before/after link, and the language switcher sends that language to the wars list. English always shows. `isShownIn` / `warsShownIn` in `wars.ts` are the only way in; pages get wars through `loadWars(locale)`. `loadAllWars()` (ungated) is for the sitemap, locale gaps, the borders route, scripts and tests only; a test fails if a page reads it. Signing off a language takes both James's `REVIEWED` entry and the file's flag.

## Editorial rules

- Same facts in every language. Dates, sides, outcomes and tolls are identical; only names and phrasing change.
- Physical verbs: attacked, crossed, besieged, took, withdrew, signed, killed. Never liberated, pacified, recovered, discovered, defended.
- "Conquest" and "invasion" only where all three Wikipedias use the word in the title. Official euphemisms only as attributed quotes.
- Name the exact actors and every outside supporter, including local allies in colonial conquests. `role: "supporter"` only where the sources say a party supplied rather than fought.
- Sides, not verdicts: no aggressor/victim wording; no winner where the sources disagree.
- Casualties: a sourced range or an attributed figure. Never a bare number or only the low end of a contested toll. Label UCDP figures `battle-deaths`. Describe each figure as its source does.
- Massacres and atrocities: plain, sourced, non-graphic wording, like a museum label.
- Mark contested dates and names `disputed: true` with a `note`.
- Two independent sources per fact, in our own words; open every source you cite.
- Pins: battle sites and cities only. The guard (`contested.ts`) rejects places China claims or disputes with a neighbour (Taiwan and its islands, Kinmen, Matsu, Pratas, Kashmir, Aksai Chin, Ladakh's border, Gilgit-Baltistan, Arunachal Pradesh, the Paracels, Spratlys, Scarborough Shoal, Senkaku/Diaoyu); pin the nearest undisputed city. Elsewhere (Falklands, Crimea, Donbas, Gaza, the Kurils) pin where it happened and name the place as each Wikipedia does. A reviewer still checks every pin.

## Maps

- Pre-1800 flagship: add the war to `WARS` in `scripts/build-borders.ts` (`self` = polities the war was fought over, red; `rivals` = neighbours, grey; cut with `extent`), add new polity names to `LABELS`, then `pnpm borders <cliopatria_polities_only.geojson> <war-id>`. Check the snapshot years. Never edit the output by hand.
- Every map has `public/geo/land/<id>.json`. Build it with `pnpm land <ne_10m_land.shp> [id ...]` (no ids rebuilds all and deletes orphans). `validate-data` says when a pin or border has moved outside the cut.

## Sources

Raw datasets live in `~/me/meanwhile-worktrees/wars-sources`, outside the repo. Never commit them or any table derived from Correlates of War (its licence forbids redistribution).

- **UCDP** (CC BY 4.0), 1946 on: `UcdpPrioConflict_v26_1.csv` and `BattleDeaths_v26_1_conf.csv` (1989–2025). A war's range: sum `bd_low` and `bd_high` separately over every row of its `conflict_id` for the years covered. Scope `battle-deaths`; `asOf` = the last day of the last year summed. Cite "Davies, S., Pettersson, T. & Öberg, M. (2026). Organized violence 1989–2025, and violent political protests. Journal of Peace Research 63(4); UCDP Battle-Related Deaths Dataset v26.1, CC BY 4.0" with https://ucdp.uu.se/downloads/.
- **Correlates of War** (`interstate.csv`, `extrastate.csv`, `intrastate.csv`), 1816–2007: cross-check dates and sides only; cite single facts.
- **Brecke Conflict Catalog** (`conflict_catalog.xlsx`), 1400–1816: finding candidates only. Verify every row elsewhere.
- **Wikidata** (CC0): ids, names, coordinates. Assign sides by hand and never use its death tolls.
- Britannica, World History Encyclopedia, Encyclopedia.com and academic histories for the account and anything ancient.
- Never Seshat (non-commercial) or PRIO Battle Deaths (frozen at 2008).

## Checklist for a new war

1. Write `data/wars/<id>.json`.
2. `pnpm sync-flags` if a new country code appears.
3. Pre-1800 flagship only: `WARS` config + `pnpm borders`.
4. `pnpm land <ne_10m_land.shp> <id>` (again after any pin or border change).
5. `pnpm validate-data`, `pnpm test`, then look at `/en/war/<id>/` (and `/zh/` unless the war is sensitive and unreviewed).
6. BCE wars: check every year by hand.
