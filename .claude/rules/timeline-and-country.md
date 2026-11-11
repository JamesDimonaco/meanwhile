---
paths:
  - "src/app/*/country/**"
  - "src/app/*/timeline/**"
  - "src/components/country/**"
  - "src/components/timeline/**"
  - "src/lib/data/country.ts"
  - "src/lib/data/queries.ts"
  - "src/lib/data/wars.ts"
---

# Timeline, country pages and queries

## Country pages

- `/[locale]/country/<code>/` exists in a language when a heartland (`data/today.json`) or a war shown in that language lists the country. UN members and the UK's three nations only. A country whose only entries are gated wars has an English page only; `localeGaps` keeps the switcher and sitemap off the missing ones.
- Nations: `gb-eng`, `gb-sct`, `gb-wls` list what carries their code; the UK page lists those too (`withUnion`) plus wars coded `GB`. Northern Ireland has no page until it is reviewed on its own.
- Overlap: two items overlap when their solid spans (`latestStart`..`earliestEnd`; an ongoing war to its `asOf` year) share a year. Two civilisations must share more than one year (a handover year is not an overlap). A war needs only one.
- Payload: the client gets `TimelineBar`s only; list cards render on the server. `client-payloads.test.ts` checks both and the review gate.

## Timeline

- `TimelineChart` (`src/components/timeline/timeline-chart.tsx`) is shared by the world and country timelines. `useYearParam` keeps `?year=`; its `YearQuery` is a required prop, so a chart can't keep `?year=` without reading it.
- A country chart opens on `openingView` (`country.ts`): the whole span, or the newest three-quarters of items when that zooms in 4x or more.
- Bars are not links (each row's name is). A tap moves the year line; a tap within `BAR_HIT_WIDTH` of a short bar snaps into it (`snapToBar`).
- Wars are drawn in `--war`. It and the nine region colours each reach 3:1 on the background and stay apart, also under protanopia and deuteranopia (`globals.test.ts`). Only the light theme is tested: nothing sets `.dark`.

## Queries (`src/lib/data/queries.ts`)

- `activeAt(cultures, year)`: cultures whose outer range contains the year; `certain` inside the solid part.
- `meanwhile(anchor, cultures)`: 4–6 cards, one region at a time, anchor's region last, deterministic. It is `pickMeanwhile(meanwhileCandidates(...))`.
- `meanwhileAtYear(year, cultures, exclude)`: the same for one year (a war's start).
- Wars (`wars.ts`): `isShownIn` / `warsShownIn` (the review gate), `warsForCulture`, `countryIndex`, `countriesToday`, `warOuter`, `warSpan`.
- Countries (`country.ts`): `countryCodes`, `countryItems`, `overlaps` / `overlapping`, `alsoAlive`, `localeGaps`, `gapsOnPagesIn`.
