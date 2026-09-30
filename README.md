# Meanwhile

"I'm looking at this. What else was happening in the world at the same time?"

A mobile-first web app for travellers and museum visitors: type a civilisation,
dynasty or year and see what other cultures were alive at the same moment.
English, Spanish and Simplified Chinese. Every page is prerendered; the only
server code is placard scanning (`/api/scan`). No Google services, so it works
in mainland China.

```bash
pnpm install
pnpm dev            # http://127.0.0.1:3000
pnpm build          # validates data, builds to .next/, checks for Google hosts
pnpm test
```

See [CLAUDE.md](CLAUDE.md) for the layout, data format and conventions.

Code: MIT (LICENSE). Data: CC BY 4.0 (data/LICENSE).
