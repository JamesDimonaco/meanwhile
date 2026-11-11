@AGENTS.md

# Who Was When

Answers "what else was happening in the world at the same time?" Mobile-first, for travellers and museum visitors on weak signal, in en / es / zh (Simplified). Called Meanwhile until October 2026: the brand lives in `appName` (`messages/<locale>/common.json`); `meanwhile.*` localStorage keys, the service worker cache name, the repo and code identifiers keep the old name on purpose.

Path-scoped manuals in `.claude/rules/`: `culture-data.md`, `wars.md`, `timeline-and-country.md`.

## Stack and commands

Next.js 16 (App Router), React 19, TypeScript, Tailwind, shadcn (base-nova, RTL-aware), next-intl, zod, vitest. pnpm.

- `pnpm dev` · `pnpm start` · `pnpm lint` · `pnpm test` · `pnpm typecheck` (runs `next typegen` first so `PageProps` exist)
- `pnpm build` = `validate-data`, `next build`, then fails on any Google host in browser-facing output.
- Data scripts: `pnpm validate-data`, `pnpm borders`, `pnpm land`, `pnpm sync-flags`, `pnpm subset-cjk-font`, `pnpm subset-latin-font`, `pnpm build-og-fonts`, `pnpm generate-icons`.
- Before handing work back: typecheck, test, lint, validate-data, and build if you touched pages.
- Add shadcn components with `pnpm dlx shadcn@4.21.0 add <name>` (pinned).

## Layout

- `data/`: `registry.json` (culture ids), `cultures/<region>/<id>.json`, `wars/<id>.json`, `borders/`, `today.json` (heartland countries), `succession.json`, `popular.json`.
- `messages/<locale>/<namespace>.json`: UI text. Namespaces listed in `src/i18n/namespaces.ts`.
- `src/lib/data/`: schema, loading, queries, validation, wars and the review gate. `load.ts` uses `fs`: server components and scripts only.
- `src/lib/years.ts`: all year maths. `src/lib/map/geo.ts`: the map frame. `src/lib/scan/`: placard scanning.
- `src/app/[locale]/`: home, `c/[id]` (culture), `timeline`, `compare`, `wars`, `country/[code]`, `war/[id]`, `credits`. `src/app/api/scan/route.ts` is the only server code.

## Rules that apply everywhere

- **Years** are signed integers, astronomical: 1 CE = 1, 1 BCE = 0, 1200 BCE = -1199. Convert only on display, via `src/lib/years.ts`; in components use `<YearText>` / `<YearRangeText>`. Call `currentYear()` on the client only: pages are prerendered.
- **No hard-coded user text.** Add every key to all three locales (English defines the keys). Every page and `generateMetadata` under `[locale]` starts with `const locale = await pageLocale(params)`. Link with `Link` from `@/i18n/navigation`.
- **Logical CSS only** (`ms-`, `pe-`, `start-`, `text-start`). Lint rejects left/right classes.
- **Nothing from Google**: no Google Fonts, maps, analytics or CDNs. Self-host every asset; subset any CJK font.
- **Static everything.** Every page and the `geo/` and manifest routes are prerendered; check the build's route table keeps them static. No middleware, cookies, rewrites or server actions.
- **Prefetch off.** Every `Link` in a list or on every page sets `prefetch={false}`. Only the header title and the footer's Timeline and Wars links keep the default.
- Browser APIs only in effects or `useSyncExternalStore`; wrap every `localStorage` call in try/catch.
- Never show TW, HK, MO, EH, PS or XK (`NEVER_SHOWN` in `src/lib/data/countries.ts`). The site must stay reachable in mainland China.
- `src/lib/data/war-review.ts` is James's file only.

## Where things live

- **Identity:** personal.
- **Live:** https://whowaswhen.com (apex primary; `www` 308s to it; `meanwhile.dimonaco.co.uk` 301s). The host is `SITE_URL` in `src/lib/seo.ts`.
- **Hosting:** Vercel project `meanwhile`, function region `iad1` (`vercel.json`). Never `hkg1`: Anthropic doesn't serve mainland China or Hong Kong.
- **DNS:** Cloudflare, DNS-only (grey cloud). Never turn the proxy on: it has no path into mainland China.
- **Analytics:** Vercel Analytics only (`@vercel/analytics`). No PostHog.
- **Env:** `ANTHROPIC_API_KEY` (server only; without it `/api/scan` answers 503), `NEXT_PUBLIC_SITE_URL` (optional override).
- **Deploy:** `vercel deploy --prod` from the main checkout `~/me/meanwhile`, which holds `.vercel/`. A worktree needs `.vercel/project.json` copied in. Production should match `main`.
- **Logs and usage:** `vercel logs`. For traffic spikes, `vercel firewall traffic list` shows top user agents, IPs and paths for the last day (per-route usage needs Observability Plus, which we don't have).
- **War datasets:** `~/me/meanwhile-worktrees/wars-sources`, never committed.

## Placard scanning

`POST /api/scan` takes a JPEG/PNG/WebP (2 MB cap, magic bytes checked) and makes one `claude-opus-5` call with JSON-schema output limited to catalogue ids. BCE/CE becomes astronomical in `decideScan`, never in the model. Low confidence never routes. Images are never stored or logged. Rate limits are in memory per instance (30 per IP per 10 min, 120 total per hour) and reset on cold start; the spend ceiling is the key's own Console workspace limit. Test with `src/lib/scan/__fixtures__/placard-*.jpg` against a local `next start` that has the key.

## Gotchas

- The first deploy from a new checkout sometimes answers "Not authorized". Retry.
- After any domain or hosting change, run a Globalping HTTP check from CN probes on `/zh/`. Beijing, Shanghai, Guangzhou and Shenzhen should answer 200.
- `/compare?ids=` makes endless cache-missing URLs, so robots disallow it. A crawler hammering it caused the Nov 2026 usage spike.
- The Vercel firewall rule "Block Qlyze" and the managed AI Bots ruleset (Deny) live in the dashboard, not the repo.
