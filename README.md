# Wedding Weekend Weather

A calm, accurate forecast for a wedding weekend in Park Slope, Brooklyn (Thu–Sat, Nov 5–7, 2026):
official National Weather Service numbers inside the NWS forecast range, and day-level model odds beyond it.

**Live:** https://jcdorr003.github.io/wedding-weather/ (installable on the Home Screen)

## Stack

TanStack Start 1.x (every page prerendered to static HTML, data fetched in the browser, no server) · React 19.3 with
the React Compiler · TypeScript 7 · Vite 8 · TanStack Query · Zod · Temporal · plain layered CSS · Vitest, MSW and
Playwright · Oxlint and Oxfmt. Why each piece: [docs/stack.md](docs/stack.md).

## Commands

| | |
|---|---|
| `pnpm dev` | Dev server with live data |
| `pnpm mock` | Build with made-up scenarios and serve it at http://localhost:4173/wedding-weather/ |
| `pnpm check` | Type check, lint, format check, unit tests |
| `pnpm build:mock && pnpm test:e2e` | Browser tests: every scenario against its snapshot, plus layout shift |
| `pnpm build && pnpm serve` | Production build, served the way GitHub Pages serves it |
| `pnpm verify:live [url]` | Check a page's numbers against the raw NWS/Open-Meteo data (default: the live site) |

Needs Node 24 and pnpm 12. Pushing to `main` runs CI and, if it passes, deploys to GitHub Pages.

## Accuracy rules

- NWS data only where NWS publishes it: the 7-day and hourly forecasts (~6 days ahead), rain amounts once they're in
  the grid data (~3 days ahead). Amounts are never estimated.
- Beyond that, the early model read is day-level odds only: no amounts, no timing.
- Rain is dusty blue, never red.
