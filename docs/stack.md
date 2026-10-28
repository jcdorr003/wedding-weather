# Stack decision — React migration (Oct 28, 2026)

The original vanilla `index.html` was rebuilt as a React app that the owner can keep growing
(more pages, bigger changes) after the wedding. Versions below were read from the npm registry on 2026-10-28;
`pnpm-workspace.yaml` only installs releases at least 3 days old, so a few are one patch behind "latest".

**Owner's calls (Oct 28):** same repo; cut over as soon as it's ready (with a yes on the
day); lean "max edge" where it's stable and helps the app scale.

## The stack

| Area | Choice | Version · status | Why for this app | Not chosen |
|---|---|---|---|---|
| Framework | **TanStack Start**: every page prerendered to static HTML, data fetched in the browser, no server | 1.169 · **1.0 stable 2026-10-13** | Typed file routes and a router ready for more pages. Built-in prerender works under `/wedding-weather/` (spike: prerendered pages, hydration and client navigation all verified). Same family as TanStack Query. | **React Router 8** framework mode (8.0 stable 2026-06-17; the fallback if Start misbehaves; the owner's work app uses it). **Next 16.4** (`output: 'export'` turns off most of what Next is for). **Astro 7.4** (islands suit content sites; this is one interactive app). **Waku** (1.0 still RC). |
| UI | **React 19.3** + **React Compiler 1.0** | 19.3 released 2026-09-09 · Compiler stable since 2025-10-07 | The Compiler memoizes automatically (no `useMemo`/`useCallback` in the code). 19.3 makes `<ViewTransition>` and Fragment refs stable, both available for later. | — |
| Language | **TypeScript 7.0** (the Go-native `tsc`) | 7.0.2 · stable 2026-07-08 | About 10× faster type checks. Temporal types are built into `lib` (`ESNext.Temporal`). | TS 6 (only needed for typescript-eslint, see lint). |
| Build | **Vite 8** (Rolldown + Oxc) | 8.3 · Vite 8 stable 2026-03-12 | Start requires Vite 8. `@vitejs/plugin-react` 6 + `@rolldown/plugin-babel` runs the Compiler. | Rsbuild (Start supports it; no reason to here). |
| Package manager | **pnpm 12** on **Node 24 LTS** | 12.15 · stable | Lockfile + `minimumReleaseAge` (supply-chain guard; TanStack had a malicious-publish incident on 2026-05-11, cleaned up within the hour, [postmortem](https://tanstack.com/blog/npm-supply-chain-compromise-postmortem)). | Bun 1.4 (fine; pnpm is the better-trodden path with Start). |
| Data | **TanStack Query 5** | 5.104 · stable | The official forecast loads first; model odds, grid details and alerts load after it in parallel, each keyed on the forecast's fetch time. Refreshes every 15 min while visible and on return; the NWS grid lookup is cached for a day. The last good copy is saved and shown immediately next time. | Hand-rolled fetch state (what the vanilla page had). |
| Validation | **Zod 4 (`zod/mini`)** | 4.6 · stable | Checks only the fields the page reads from NWS and Open-Meteo. A malformed response reads as "incomplete forecast" instead of a crash. Small bundle cost. | Valibot 1.5 (smaller still; less ecosystem). |
| Dates | **Temporal** + `temporal-polyfill` loaded only where missing | Native in Chrome/Edge 144+ and Firefox 139+. **Not in Safari or iOS Safari yet** ([caniuse](https://caniuse.com/temporal): Technology Preview only) | America/New_York ⇄ UTC period math (06Z rain blocks, the Overnight period, "issued" day) is clearer with `Instant`/`ZonedDateTime`/`PlainDate`. Her iPhone gets the 20 kB polyfill; Chrome uses native. | date-fns 4 + @date-fns/tz (fine, but Temporal is the platform's answer). |
| Styling | **Plain modern CSS** in layered partials (`src/styles/`): `light-dark()` tokens, subgrid, `:has()`; self-hosted variable Lora + Work Sans, preloaded | Baseline | The brittanyandjc.com look carried over exactly; Lightning CSS (via Vite) bundles the partials and lowers newer syntax for older Safari. | Tailwind 4.3 (rewriting a bespoke look into utilities risks drift for no gain). CSS Modules (stable class names double as test hooks). |
| Loading | Prerendered **skeletons built from the real card markup** | — | An inline head script guesses each card's kind from today's date (full forecast ≤ 6 days out, model read beyond, passed) so the skeleton has the right shape before any JS runs. Measured layout shift while loading: **≤ 0.003** in every normal scenario (vanilla: 0.14–0.71). | — |
| Charts | The hourly rain timeline stays hand-built (typed React) | — | Exact look, accessible (each hour is focusable, with an aria-label and tooltip). | Recharts / visx (heavier, harder to keep calm). |
| PWA | Same `manifest.webmanifest` (`id: "/wedding-weather/"`, `scope`/`start_url` `./`, same icons) and the dark/light touch-icon script | — | The Home Screen install carries over unchanged. **No service worker yet** (the vanilla page had none). iOS 26 opens any Home Screen site as a web app with no SW needed ([WebKit, Safari 26.0](https://webkit.org/blog/17333/webkit-features-in-safari-26-0/)). | `vite-plugin-pwa` 2.0 for offline use: a good next step after cutover, kept out so a caching bug can't strand her phone on an old build during wedding week. |
| Unit tests | **Vitest 5** + **MSW 3** (`msw/node`) | 5.0 (2026-09-03) · MSW 3.0 (2026-09-28) | The six mock scenarios are MSW handlers shared by unit tests, browser tests and the local mock. `vi.setSystemTime` fakes the clock (Vitest 5 also fakes Temporal). | — |
| E2E | **Playwright 1.64** | stable | Each mock scenario at 375 and 1440 px against an approved snapshot (every number and label, plus card column counts), and layout shift while loading. Parity with the vanilla page was proven before it was deleted. | — |
| Audit | `scripts/audit/` → `pnpm verify:live [url]` | — | Independent Python recomputation from the raw APIs (rain amounts included), compared with what any page shows. | — |
| Lint / format | **Oxlint 1.89** + `oxlint-tsgolint` 7 (type-aware, stable 2026-09-11) · **Oxfmt** 0.74 | — | Works with TS 7. **typescript-eslint can't run on TS 7** (peer `typescript <6.1`). | ESLint 10 + typescript-eslint (blocked on TS 7). Biome 2.6 (fine; Oxc matches the Vite/Rolldown toolchain). |
| Toolchain wrapper | — | — | Vite+ (`vp`, 1.x, MIT) bundles the same tools under one CLI. Skipped for now because Start owns the Vite config; easy to add later. | — |
| CI / deploy | One GitHub Actions workflow: checks on every push and PR; on `main`, deploy to Pages **only after they pass** | checkout v7, setup-node v7, pnpm/action-setup v6, upload-pages-artifact v5, deploy-pages v5 | Publishes only `dist/client` (no source, dev tools or notes). | Committing build output to `main` (keeps Pages settings, but puts generated files in git). Another host (new URL; the Home Screen install wouldn't carry over). |

## Reliability (audit, Oct 28)

- The page re-renders every minute (shared `useNow` tick, paused while hidden), so past hours, passed days and expired
  alerts update while it's open. Pure functions take `now` explicitly, so the React Compiler can't cache a stale time.
- The forecast refreshes every 15 minutes while visible, plus on focus and reconnect. The NWS grid lookup is cached
  for a day, so a refresh is two parallel requests instead of three sequential ones.
- Each request retries 5xx/429/network failures (800 ms, 1600 ms backoff), times out after 15 s, and is cancelled
  through TanStack Query's abort signal.
- A failed extra (model odds, rain amounts, alerts) is dropped rather than shown stale.

## Sources (primary, checked Oct 28, 2026)

- React 19.3: https://react.dev/blog/2026/09/09/react-19-3 · React Compiler 1.0: https://react.dev/blog (Oct 7, 2025)
- TanStack Start 1.0: https://tanstack.com/blog/tanstack-start-1-0 · prerendering: https://tanstack.com/start/latest/docs/framework/react/guide/static-prerendering
- React Router 8 changelog: https://github.com/remix-run/react-router/blob/main/CHANGELOG.md
- Vite 8: https://vite.dev/blog/announcing-vite8 · Rolldown 1.0: https://voidzero.dev/posts/announcing-rolldown-1-0
- TypeScript 7: https://devblogs.microsoft.com/typescript/ (7.0 stable 2026-07-08; npm `typescript@7.0.2`)
- typescript-eslint TS peer range: `npm view typescript-eslint peerDependencies` (`typescript >=4.8.4 <6.1.0`)
- Oxlint type-aware stable: https://oxc.rs/blog/2026-07-22-type-aware-linting-stable · tsgolint: https://github.com/oxc-project/tsgolint
- Vitest 5: https://vitest.dev/blog/vitest-5 · MSW 3.0: https://github.com/mswjs/msw/releases
- Temporal support: https://caniuse.com/temporal · polyfill: https://github.com/fullcalendar/temporal-polyfill
- iOS Home Screen web apps: https://webkit.org/blog/17333/webkit-features-in-safari-26-0/
- vite-plugin-pwa 2.0: https://github.com/vite-pwa/vite-plugin-pwa/releases
- deploy-pages v5: https://github.com/actions/deploy-pages/releases
- TanStack npm incident: https://tanstack.com/blog/npm-supply-chain-compromise-postmortem
