export const POINT = { lat: 40.665, lon: -73.971 } as const
export const WEDDING_DAYS = ['2026-11-05', '2026-11-06', '2026-11-07'] as const
// Prerendered before any script runs; a unit test keeps it in step with WEDDING_DAYS.
export const WEDDING_TITLE = 'Thursday–Saturday, November 5–7'
export const THRESHOLD = 20 // NWS starts saying "slight chance" at 20%
export const TZ = 'America/New_York'
export const CACHE_KEY = 'wedding-weather:v1'
export const STALE_MS = 15 * 60 * 1000
export const WET_INCHES = 0.04 // a day counts as rainy in a model run at 0.04" or more
export const ENSEMBLES = [
  { name: 'US model (GFS)', match: 'gefs' },
  { name: 'European model (ECMWF)', match: 'ecmwf' },
] as const

// ?days=YYYY-MM-DD,YYYY-MM-DD,YYYY-MM-DD previews the layout with dates already in the forecast.
export function daysFromSearch(search: string): { days: string[]; preview: boolean } {
  const override = (new URLSearchParams(search).get('days') ?? '')
    .split(',')
    .filter((s) => /^\d{4}-\d{2}-\d{2}$/.test(s))
  return override.length === 3 ? { days: override, preview: true } : { days: [...WEDDING_DAYS], preview: false }
}
