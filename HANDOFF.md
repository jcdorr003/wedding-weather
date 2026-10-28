# Handoff

Read `CLAUDE.md` first (owner's rules), then `README.md` (commands). History lives in git.

## Current state (Oct 28, 2026)

- **Live:** the React app (TanStack Start, prerendered, no server) at https://jcdorr003.github.io/wedding-weather/.
  Pages builds from GitHub Actions; `.github/workflows/ci.yml` deploys from `main` only after every check passes.
- **Branches:** `main` only. Work happens on a short-lived branch that's deleted after it merges.
- **Accuracy:** `pnpm verify:live` re-derives every number from the raw NWS and Open-Meteo APIs (Python, no shared
  code with the app) and compares it with what the page shows, including rain amounts. It last matched on Oct 28.
- **Saved copy:** localStorage `wedding-weather:v1`. Its shape is `Forecast` in `src/lib/types.ts`; keep it stable
  (phones that already have one rely on it when NWS is down). `src/lib/data/cache.ts` validates the whole shape and
  ignores a copy that doesn't match: an old copy without `links` crashed every open on one phone (Oct 28). Change
  the schema there together with the type.
- **Home Screen install:** manifest `id: "/wedding-weather/"`, `scope`/`start_url` `./`, icons in `public/icons/`.
  Keep all of them as they are.

## Testing

- `pnpm check`: types, lint (warnings fail), format, unit tests.
- `pnpm build:mock && pnpm test:e2e`: each of the six mock scenarios at 375 and 1440 px against its snapshot in
  `tests/e2e/__snapshots__/` (every number and label, plus card column counts), and layout shift while loading.
  After an intended change, review the diff and run `pnpm exec playwright test --update-snapshots`.
- Mock scenarios (`src/mocks/scenarios.ts`) each pretend a fixed time, so snapshots never drift.
- iOS has no native Temporal, and the polyfill can land after hydration on a cold Home Screen launch (that was the
  intermittent "Something went wrong!"). Nothing rendered before `temporalReady` (the loading `Shell`) may touch
  Temporal. `tests/e2e/safari.spec.ts` removes Temporal and delays the polyfill chunk to keep it that way. WebKit
  itself can't run in this WSL (missing system libraries).
- `build:mock` builds into `dist/` and then moves it to `dist-mock/`, so run the real `pnpm build` afterwards.
- Gotchas: `pkill -f <pattern>` in a shared shell can kill the shell itself. Some preview panes load local pages as
  `data:` snapshots, which drops `?scenario=`.

## Next

- Hosting move to the homelab: a proposal awaits the owner's approval (kept local and uncommitted while the repo is
  public, since it describes the homelab). Nothing built. Then offline support on the new origin, then the repo goes private.

- Service worker / offline support, after the wedding (Nov 8+). Not before, so a caching bug can't strand her phone
  on an old version.
- After the wedding, remind the owner that the repo is public on an account they also use for work: make it private
  or delete it.
