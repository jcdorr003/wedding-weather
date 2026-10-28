// Tiny scripts inlined into <head>, so they run before first paint (no JS bundle needed yet).
import { WEDDING_DAYS } from './config'
import { skeletonScript } from './skeleton'
import { SCENARIOS } from '../mocks/scenarios'

const BASE = import.meta.env.BASE_URL

/** iOS can't switch a Home Screen icon with dark mode, so offer the dark one if the phone is dark when it's added. */
export const touchIconScript = `(() => {
  try {
    const dark = matchMedia('(prefers-color-scheme: dark)');
    const pick = () => {
      document.getElementById('touch-icon').href = '${BASE}' + (dark.matches ? 'icons/apple-touch-icon-dark.png' : 'icons/apple-touch-icon.png');
    };
    pick();
    dark.addEventListener('change', pick);
  } catch { /* keep the light icon */ }
})();`

// Mock builds guess the skeleton from the scenario's pretend time, like the rest of the page.
const mockNow = () => {
  const times = JSON.stringify(Object.fromEntries(Object.entries(SCENARIOS).map(([k, s]) => [k, s.now])))
  return `Date.parse(${times}[new URLSearchParams(location.search).get('scenario')] || ${times}.wedding)`
}

/** Marks <html data-skel-N> with each wedding day's likely card shape before React hydrates. */
export const skeletonHeadScript = skeletonScript(WEDDING_DAYS, import.meta.env.MODE === 'mock' ? mockNow() : undefined)
