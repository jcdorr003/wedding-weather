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
- **Never deploy without a local mock first.** Before pushing anything to `main`, run `python3 dev/build-mock.py`,
  hand the owner `dev/wedding-weather-mock.html` to open locally, and wait for an explicit yes.
  Screenshots alone are not enough.
- Match the owner's wedding site (brittanyandjc.com): ivory `#fffaf5`, crimson `#9b1b22`, wine `#6d1d2d`,
  blush `#eed8ce`, Lora + Work Sans, hand-drawn line art.

## Layout

- `index.html` — the whole app (inline CSS/JS, no build step).
- `manifest.webmanifest`, `icons/` — installable app + light/dark icons.
- `dev/` — local tooling, **not for `main`** (see HANDOFF.md):
  - `mock-data.js` + `build-mock.py` → `wedding-weather-mock.html` with scenario buttons
    (wedding week, today, halfway, NWS down, Sat 9:30 AM, Sat 2:30 AM). It replaces `fetch()` and, for some
    scenarios, the clock, so the real page code runs against made-up data.
  - `audit/` — independent recomputation from the raw APIs to check the page's numbers
    (`expected.py`, `compare.py`, `parts.py`).

## Data sources

- NWS: `/points/40.665,-73.971` → OKX grid 35,40; `forecast`, `forecastHourly`, `forecastGridData`
  (rain amounts, gusts, thunder), `/alerts/active?point=…`. All allow browser CORS.
- Open-Meteo ensemble API (GFS 31 runs + ECMWF 51 runs) for the early model read only.
