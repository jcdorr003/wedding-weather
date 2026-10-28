# Handoff — Oct 28, 2026

Windows/WSL → owner's Mac (Oct 27) → back to the Windows PC (Oct 28). Read `CLAUDE.md` first.

## State

- `main` = what's live. **Deployed Oct 28 ~1:40 AM EDT (`1528b63`): this branch's `index.html`** after the owner
  re-checked the mock and said yes. Verified: live HTML byte-identical, manifest/icons 200, Chrome installability
  only `in-incognito`.
- **Cutover done Oct 28 ~2:35 AM EDT, on the owner's "Go for it".** The React rebuild (merge `4fbc021`) is live.
  Pages source is now **GitHub Actions** (`deploy.yml`, every push to `main`). Verified live: React HTML served,
  manifest `id`/`scope`/`start_url` unchanged, icons 200, `CLAUDE.md`/`HANDOFF.md`/`dev/` 404 (not published),
  Chrome installability: no errors, audit MATCH (wedding days and Oct 29–31). Stack and reasons: `docs/stack.md`.
- Ask the owner whether the Home Screen icon on her iPhone still opens fine (it should: same URL and manifest id).

## React rebuild (Oct 28, ~1:30–2:30 AM EDT)

Owner's decisions: same repo; cut over "as soon as we are ready" (still needs a yes on the day); lean max edge.
They answered "do whatever you recommend" to the stack, and said "lighten up" about process.

Done:
- TanStack Start 1.0 (prerendered static HTML, browser-side fetching, no server) + React 19.3 + Compiler + TS 7 +
  Vite 8 + TanStack Query + Zod mini + Temporal (polyfill only where missing: iOS Safari). Details: `docs/stack.md`.
- Logic ported 1:1 from `legacy/index.html` into pure modules (`src/lib/forecast.ts`, `src/lib/nws.ts`). Same
  localStorage key and saved-copy format, so after cutover her phone's saved copy still loads.
- Six mock scenarios → MSW handlers (`src/mocks/scenarios.ts`) + injected clock (`clock.pretend`), shared by Vitest,
  Playwright and the mock build.
- **Parity:** Playwright compares every number and label against the vanilla mock in all six scenarios at 375 and
  1440 px. All 12 match. **Audit:** `expected.py` vs both the React build and the live page: MATCH on the wedding
  days (model reads) and on Oct 29–31 (full cards and hourly data); React and live extracted identically.
- Owner asked for no "popping in": prerendered skeletons built from the real card markup, plus an inline head script
  that picks each card's shape from today's date. Self-hosted, preloaded fonts. The mock banner is fixed to the
  bottom. CLS while loading ≤ 0.003 (vanilla 0.14–0.71). Exceptions: a real alert sliding in (0.087 on phone) and
  NWS-down collapsing to short error cards.
- CI (`.github/workflows/ci.yml`) runs everything on push. `deploy.yml` runs only when triggered by hand.
- Repo layout: `index.html` → `legacy/index.html`, `icons/` + manifest → `public/`. `dev/build-mock.py` now reads
  `legacy/index.html` (output byte-identical).

Not done / next:
- Service worker / offline: deliberately left out until after the wedding (see stack.md).
- Inherited quirk kept for parity: `.alerts { display: grid }` overrides `hidden` (extra ~20 px when no alerts).

Tooling notes: pnpm 12 was installed through Volta on this box (`volta install pnpm@12.15.0`). Playwright's
Chromium is in `~/.cache/ms-playwright`. `pkill -f <pattern>` in a shared shell can kill the shell itself; avoid it.

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

## Before pushing to `main` (a push deploys)

1. Get the owner's explicit yes after they've tried the mock (`pnpm mock`).
2. Pages now publishes only `dist/client`, so source, `dev/` and these notes can live on `main` safely.
3. After deploying, confirm the live page serves the new `index.html` and Chrome's installability check
   still passes (`Page.getInstallabilityErrors` via CDP; only `in-incognito` is expected in a test browser).

## Testing notes

- React: `pnpm check` (types, lint, format, unit), `pnpm build:mock && pnpm test:e2e` (parity + layout shift;
  screenshots of both pages land in `tests/e2e/out/`), `pnpm mock` for the owner.
- Vanilla: `python3 dev/build-mock.py` rebuilds its mock after any `legacy/index.html` change (it's the parity reference).
- Audit (any page): `python3 dev/audit/expected.py <days> > exp.json`, `node dev/audit/extract.mjs <url> > got.json`,
  then `python3 dev/audit/compare.py exp.json got.json <days>`. For the React build: `pnpm build && pnpm serve`
  → `http://localhost:4173/wedding-weather/`. `?days=YYYY-MM-DD,…` previews any three dates inside the NWS range.
- Some previewers (e.g. the Claude desktop app's browser pane) load local HTML as a `data:` snapshot,
  which drops `?scenario=…`. To check one scenario there, make a temporary copy of the mock with the
  default changed (`params.get('scenario') : 'wedding'` → another key), and delete the copy afterwards.

## After the wedding

Remind the owner the repo is public on an account they also use for work; make it private or delete it.
