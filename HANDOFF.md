# Handoff — Oct 28, 2026

Windows/WSL → owner's Mac (Oct 27) → back to the Windows PC (Oct 28). Read `CLAUDE.md` first.

## State

- `main` = what's live. Last deploy: dark-mode tab and Home Screen icons.
- **This branch (`audit-fixes`) is tested but NOT approved for deploy yet.** The owner was given the mock page
  to try and has not said yes. Do not merge until they do.

## Mac session, Oct 28 (just after midnight EDT)

- Live site checked: it was byte-identical to `main`. The latest NWS forecast (issued 11:32 PM Oct 27) ran
  only through Tue Nov 3, so all three wedding days correctly showed the early model read.
  Model-run counts matched `dev/audit/expected.py` exactly (Thu 19/31 GFS, 27/51 ECMWF; Fri 12/31, 28/51;
  Sat 9/31, 21/51). There were no alerts. Expected NWS coverage: Thu around Oct 30, Fri around Oct 31,
  Sat around Nov 1.
- `7a2633d`: fixed the out-of-date "Halfway" mock banner note (it still mentioned the removed
  soaking-rain odds).
- `9871a28`: the owner said the day cards looked off because sections sat at different heights depending
  on text length. On wide screens (>760px) the cards now use CSS subgrid. Every section (head, temp,
  conditions, stats, `.day-text` (description + thunder), `.parts-wrap`, `.night`) is pinned to a shared
  row, so each lines up across the three cards. Model-read/pending cards wrap their body in `.day-body`
  spanning rows 2–7. Phone layout (stacked) is unchanged. Checked in the mock at 1440px: Wedding week
  (all sections measured at identical offsets), Halfway, Sat 9:30 AM, Today and NWS down. At 375px the
  cards stack at their natural height. **Not visually checked: Sat 2:30 AM** (same card code path).
- The owner has not yet tried the mock with these changes and has not approved a deploy.

## PC session, Oct 28 (~1 AM EDT)

- Sat 2:30 AM mock checked at 1440/1024/375px: fine, Saturday shows the 47° night low. Live site = `main`;
  NWS (issued 11:32 PM Oct 27) still ends Tue Nov 3, so all three days show the model read; run counts
  matched `expected.py`. No alerts. Live page says "issued 11:32 PM" without the day (fixed on this branch).
- The owner tried the mock: in Halfway, Saturday's model-read card stretched to the height of the full
  Thu/Fri cards and looked empty. Fix: in a row with at least one full forecast card, model-read / pending /
  passed cards leave the subgrid and keep their natural height (`.days:has(> .day > .temp) > .day:has(> .day-body)`).
  When all three are model reads (Today) they still stretch to equal height. Re-measured every scenario at
  1440px: full cards still line up exactly; no errors.
- Deploy still NOT approved — the owner said "do whatever you recommend" about committing, not a deploy yes.

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

Layout:
- Day-card sections line up across cards on wide screens (see the Mac session notes above). Short cards
  (model read, pending, passed) next to full ones keep their own height (PC session notes).

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
- Some previewers (e.g. the Claude desktop app's browser pane) load local HTML as a `data:` snapshot,
  which drops `?scenario=…`. To check one scenario there, make a temporary copy of the mock with the
  default changed (`params.get('scenario') : 'wedding'` → another key), and delete the copy afterwards.

## After the wedding

Remind the owner the repo is public on an account they also use for work; make it private or delete it.
