// TanStack Query definitions. The official forecast comes first; model odds, grid details and alerts are "extras"
// keyed on the forecast's fetch time, so every refresh re-fetches them.
import { queryOptions } from '@tanstack/react-query'
import { loadAlerts, loadDetails, loadForecast, loadPoints } from '../api/nws'
import { loadModels } from '../api/openMeteo'
import { STALE_MS } from '../config'

const DAY_MS = 24 * 60 * 60 * 1000

// getJSON already retries each request, so queries don't retry on top of it.
const common = { retry: false } as const

/** A failed extra resolves to null: the page drops it rather than show stale extras under a fresh timestamp. */
const orNull = async <T>(load: Promise<T>, signal: AbortSignal) => {
  try {
    return await load
  } catch (e) {
    if (signal.aborted) throw e
    return null
  }
}

/** Grid lookup (forecast URLs, radar station, zones). Cached for a day, so a refresh skips this round trip. */
export const pointsQuery = () =>
  queryOptions({ ...common, queryKey: ['points'], queryFn: ({ signal }) => loadPoints(signal), staleTime: DAY_MS })

export const forecastQuery = (days: readonly string[]) =>
  queryOptions({
    ...common,
    queryKey: ['forecast', days],
    queryFn: async ({ client, signal }) => loadForecast(await client.fetchQuery(pointsQuery()), days, signal),
    staleTime: STALE_MS,
    // Phones keep tabs open for days: refresh every 15 minutes while visible, and on return or reconnect.
    refetchInterval: STALE_MS,
    refetchIntervalInBackground: false,
  })

const extra = { ...common, staleTime: Infinity } as const

export const modelsQuery = (fetchedAt: string | undefined, uncovered: readonly string[], today: string) =>
  queryOptions({
    ...extra,
    queryKey: ['models', fetchedAt, uncovered],
    queryFn: ({ signal }) => orNull(loadModels(uncovered, today, signal), signal),
  })

export const detailsQuery = (fetchedAt: string | undefined, gridUrl: string | null, days: readonly string[]) =>
  queryOptions({
    ...extra,
    queryKey: ['details', fetchedAt, gridUrl, days],
    queryFn: ({ signal }) => orNull(loadDetails(gridUrl ?? '', days, signal), signal),
  })

export const alertsQuery = (fetchedAt: string | undefined) =>
  queryOptions({
    ...extra,
    queryKey: ['alerts', fetchedAt],
    queryFn: ({ signal }) => orNull(loadAlerts(signal), signal),
  })
