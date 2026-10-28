# Handoff — Oct 27, 2026

Moved from a Windows/WSL session to the owner's Mac. Read `CLAUDE.md` first.

## State

- `main` = what's live. Last deploy: dark-mode tab and Home Screen icons.
- **This branch (`audit-fixes`) is tested but NOT approved for deploy yet.** The owner was given the mock page
  to try and has not said yes. Do not merge until they do.

## What's on this branch (vs `main`)

Accuracy audit — every number on the page was checked against an independent recomputation from the raw
NWS and Open-Meteo data (daily, all hourly values, model-run counts, rain-amount blocks): all matched.

Logic fixes (mostly for viewing on the wedding days themselves):
- Past hours on the current day were shown as "no data" and the verdict said "Dry so far… data ends at 11 PM".
  Now: "Dry the rest of the day", past hours labelled "already passed".
- 12–6 AM on a wedding day, the NWS "Overnight" period was taken as that night's forecast (wrong low).
  Night is now the period starting at/after noon.
- "NWS forecast issued 6:00 AM" now names the day if it isn't today.
- Days after the wedding say "This day has passed".
- NWS down with nothing cached: clear message, no empty charts.
- Official forecast renders first; models / grid details / alerts load after in parallel.
- A failed model or grid fetch drops stale saved extras instead of showing them under a fresh timestamp.

New (all NWS):
- "Rain by time of day" in each day card: four 6-hour blocks aligned to NWS's own QPF periods
  (06Z start = 1 AM EST): peak hourly chance + exact NWS rain amount, plus a total. Amounts appear only
  when NWS has published them for the whole block.
- NWS watches/warnings/advisories for the point (status Actual only, sorted by severity).
- Daytime gusts when ≥5 mph above the steady wind; thunder line if ≥15%.
- Live radar link (station from `/points`, currently KDIX).

Deliberately removed after discussion: model "soaking rain" odds 9–11 days out (low skill, would add worry).

## Before merging to `main`

1. Get the owner's explicit yes after they've tried `dev/wedding-weather-mock.html`.
2. **Do not ship `dev/`, `CLAUDE.md` or `HANDOFF.md` to `main`** — Pages would publish them. Bring over only
   `index.html`, e.g. `git checkout main && git checkout audit-fixes -- index.html`.
3. After pushing, confirm the live page serves the new `index.html` and Chrome's installability check
   still passes (`Page.getInstallabilityErrors` via CDP; only `in-incognito` is expected in a test browser).

## Testing notes

- `python3 dev/build-mock.py` rebuilds the mock after any `index.html` change.
- Audit: `python3 dev/audit/expected.py 2026-11-05,2026-11-06,2026-11-07 > exp.json`, load the page in a
  headless browser to extract what it shows, then `python3 dev/audit/compare.py exp.json got.json <days>`.
  The headless extraction script was machine-specific and isn't included; `?days=YYYY-MM-DD,…` on the page
  previews any three dates already inside the NWS range.

## After the wedding

Remind the owner the repo is public on an account they also use for work; make it private or delete it.
