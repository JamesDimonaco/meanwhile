# Third-party notices

Meanwhile's own code is MIT ([LICENSE](LICENSE)) and its dataset is CC BY 4.0
([data/LICENSE](data/LICENSE)). These parts of the repository come from
elsewhere and keep their own licences.

## Files in this repository

| What | Where | Licence | Notice |
|---|---|---|---|
| Inter, subset | `public/fonts/inter-*.woff2`, `assets/og-fonts/inter-*.ttf` | SIL Open Font License 1.1 | Copyright 2016 The Inter Project Authors. Licence text: `inter-LICENSE.txt` beside the fonts |
| Noto Sans SC, subset | `public/fonts/noto-sans-sc-subset.woff2`, `assets/og-fonts/noto-sans-sc-og.otf` | SIL Open Font License 1.1 | © 2014-2021 Adobe (in the font's metadata). Licence text: `noto-sans-sc-LICENSE.txt` beside the fonts |
| flag-icons | `public/flags/*.svg` | MIT | Copyright (c) 2013 Panayiotis Lipiridis. Licence text: `public/flags/LICENSE` |
| Natural Earth 1:50m land, clipped and simplified | `public/geo/` | Public domain | Made with Natural Earth, https://www.naturalearthdata.com |
| Cliopatria border polygons, simplified | `data/borders/` | CC BY 4.0 | Cited, with the changes made, in each file's `sources` |
| UCDP battle-death figures and conflict dates | `data/wars/` | CC BY 4.0 | Cited on each figure; the datasets themselves are not included |
| shadcn/ui components | `src/components/ui/` | MIT | Copyright (c) 2023 shadcn |

The subset fonts are Modified Versions under the OFL and keep their original
names, which reserve no font name.

## Cited, not included

- Correlates of War war data: used to cross-check dates and sides. Its terms
  do not allow redistribution, so no file or table from it is in this
  repository or its history; only individual facts, in our own words, with a
  citation.
- PeriodO (public domain), Wikidata (CC0) and Pleiades (CC BY): dates, names,
  identifiers and coordinates, cited per record in `data/`.

The app's credits page (`/en/credits/`) lists every source, what was taken
from it and what was changed.

## npm dependencies

Dependencies are installed from npm, not committed, and each keeps its own
licence. None is GPL or AGPL. `next` pulls in `sharp`, whose prebuilt libvips
binary is LGPL-3.0-or-later; it is an optional, dynamically linked install,
not part of this repository.
