# Wedding Weekend Weather

A single-page forecast for a wedding weekend in Park Slope / Prospect Park, Brooklyn, Thu–Sat Nov 5–7, 2026.
Live at https://jcdorr003.github.io/wedding-weather/ (GitHub Pages, served from `main`, ~1 minute to deploy).

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
  explicit yes. Screenshots alone are not enough. (Vanilla page: `python3 dev/build-mock.py` →
  `dev/wedding-weather-mock.html`.)
- Match the owner's wedding site (brittanyandjc.com): ivory `#fffaf5`, crimson `#9b1b22`, wine `#6d1d2d`,
  blush `#eed8ce`, Lora + Work Sans, hand-drawn line art.

## Layout (branch `react-migration`; `main` still serves the vanilla page until cutover)

- React app: TanStack Start (prerendered, no server) + React 19.3 + TS 7 + Vite 8. Why each piece: `docs/stack.md`.
  - `src/routes/` pages (`__root.tsx` holds the head: manifest, icons, fonts, skeleton script) · `src/components/`
  - `src/lib/nws.ts` fetch + Zod schemas + loaders · `src/lib/forecast.ts` everything the page shows (pure)
  - `src/lib/useForecast.ts` TanStack Query wiring · `src/lib/time.ts` Temporal helpers and the one clock
  - `src/mocks/` the six scenarios as MSW handlers (mock builds only) · `public/` manifest + icons
- `legacy/index.html` — the vanilla page (what `main` serves today), kept as the parity reference.
- `pnpm dev` · `pnpm mock` (mock build at localhost:4173) · `pnpm check` (types, lint, format, unit) · `pnpm test:e2e`
  (needs `pnpm build:mock`: parity with the vanilla mock in every scenario, plus layout shift).
- `dev/` — vanilla mock (`build-mock.py`, `mock-data.js`) and `audit/` (independent recomputation:
  `expected.py`, `extract.mjs` reads any page, `compare.py`). See HANDOFF.md for the audit commands.

## Data sources

- NWS: `/points/40.665,-73.971` → OKX grid 35,40; `forecast`, `forecastHourly`, `forecastGridData`
  (rain amounts, gusts, thunder), `/alerts/active?point=…`. All allow browser CORS.
- Open-Meteo ensemble API (GFS 31 runs + ECMWF 51 runs) for the early model read only.
