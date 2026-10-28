# Wedding Weekend Weather

A single-page forecast for a wedding weekend in Park Slope / Prospect Park, Brooklyn, Thu–Sat Nov 5–7, 2026.
Live at https://jcdorr003.github.io/wedding-weather/. GitHub Pages via Actions: every push to `main` runs the checks, then
deploys `dist/client` (~3 minutes). See README.md for commands.

## Rules from the owner

- **Accuracy comes first.** The point of this page is to replace the anxiety of 10-day consumer forecasts with
  numbers that hold up. Show official NWS data only inside the range where NWS itself publishes it:
  - Daily and hourly forecast: ~7 days / ~156 hours (`api.weather.gov` forecast + forecastHourly).
  - Rain amounts: only once NWS publishes them in the grid data (~3½ days out). Never estimate or prorate them.
  - Beyond the NWS range, the "early model read" is day-level odds only ("Leaning dry / Could go either way /
    Leaning wet") with a low-confidence line. **No model amounts, no timing, no soaking odds, no icons.**
- **Calm framing.** No red for rain (rain is dusty blue); crimson is for titles only.
- **Never deploy without a local mock first.** Before pushing anything to `main`, run `pnpm mock` and give the owner
  `http://localhost:4173/wedding-weather/` to open locally (scenario switcher at the bottom), then wait for an
  explicit yes. Screenshots alone are not enough.
- **Code style:** arrow functions everywhere (`const X = () => …`), implicit returns where the body is just a return.
  Pure functions take `now` explicitly. Delete branches once they're merged.
- **No AI attribution in git.** No `Co-Authored-By` trailers, "Generated with" lines or similar in commits, PR
  descriptions or anything else pushed. The owner doesn't want Claude showing up as a contributor. (Talking about it,
  and this file, is fine.) History was rewritten on Oct 28, 2026 to remove the old trailers.
- Match the owner's wedding site (brittanyandjc.com): ivory `#fffaf5`, crimson `#9b1b22`, wine `#6d1d2d`,
  blush `#eed8ce`, Lora + Work Sans, hand-drawn line art.

## Layout

- `src/routes/` — `__root.tsx` (document head: manifest, icons, fonts, inline scripts) and `index.tsx` (the page)
- `src/components/` — page sections, day cards, `timeline/` (cards, chart, tooltip), loading skeletons
- `src/lib/api/` — HTTP with retries/timeouts, Zod schemas, NWS and Open-Meteo loaders
- `src/lib/forecast/` — everything the page shows, as pure functions (day cards, timelines, header text, formatting)
- `src/lib/data/` — TanStack Query definitions, `useForecast`, the saved copy in localStorage
- `src/lib/` — `config`, `time` (Temporal helpers + the one clock), `useNow`, `skeleton`, `head-scripts`, `types`
- `src/mocks/` — the six scenarios (`scenarios.ts`) and their MSW handlers; mock builds only
- `src/styles/` — `app.css` imports the layered partials
- `tests/unit/` (Vitest + MSW) · `tests/e2e/` (Playwright: scenario snapshots, layout shift)
- `scripts/serve.mjs` (serves a build like Pages) · `scripts/audit/` (independent check against the raw APIs)

## Data sources

- NWS: `/points/40.665,-73.971` → OKX grid 35,40; `forecast`, `forecastHourly`, `forecastGridData`
  (rain amounts, gusts, thunder), `/alerts/active?point=…`. All allow browser CORS. No keys anywhere.
- Open-Meteo ensemble API (GFS 31 runs + ECMWF 51 runs) for the early model read only.
