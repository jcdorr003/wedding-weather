import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { STALE_MS } from './config'
import { type Core, type Forecast, cache, loadAlerts, loadDetails, loadFromNWS, loadModels } from './nws'
import { todayNY } from './time'

/**
 * The official NWS forecast renders first; model odds, grid details (rain amounts, gusts, thunder) and alerts
 * load after it in parallel. Each extra is keyed on the forecast's fetch time, so every refresh re-fetches it
 * while still showing the previous copy. A failed extra resolves to null, dropping stale saved extras rather
 * than showing them under a fresh timestamp.
 */
const waiting = (q: { isFetching: boolean; isPlaceholderData: boolean }, on: boolean) =>
  on && (q.isFetching || q.isPlaceholderData)

export function useForecast(days: readonly string[], preview: boolean) {
  const qc = useQueryClient()
  const [saved] = useState(() => (preview ? null : cache.read()))

  // A saved copy (initial data) carries the extras it was saved with; a live fetch doesn't.
  const core = useQuery<Core & Partial<Forecast>>({
    queryKey: ['nws', days],
    queryFn: () => loadFromNWS(days),
    initialData: saved ?? undefined,
    initialDataUpdatedAt: 0, // a saved copy is always refreshed straight away
    staleTime: STALE_MS, // phones keep tabs alive for days; refetch on return once older than this
    retry: false, // getJSON already retries
  })
  const live = core.isFetchedAfterMount && core.isSuccess
  const base = core.data ?? null
  const fetchedAt = base?.fetchedAt

  const today = todayNY()
  const uncovered = base ? days.filter((k) => k >= today && !base.daily.some((p) => p.date === k)) : []
  // Rain amounts, gusts and thunder only matter once a shown day is inside the 7-day forecast.
  const inRange = base ? days.some((k) => k >= today && k <= base.dailyEnd) : false
  const gridUrl = base?.gridUrl ?? null

  const extra = <T>(name: string, enabled: boolean, load: () => Promise<T>, savedValue: T | null | undefined) =>
    ({
      queryKey: [name, fetchedAt, days],
      queryFn: () => load().catch(() => null),
      enabled: live && enabled,
      placeholderData: (prev: T | null | undefined) => prev ?? savedValue ?? null,
      staleTime: Infinity,
      retry: false,
    }) as const

  const models = useQuery(extra('models', uncovered.length > 0, () => loadModels(uncovered), saved?.models))
  const details = useQuery(
    extra('details', inRange && !!gridUrl, () => loadDetails(gridUrl ?? '', days), saved?.details),
  )
  const alerts = useQuery(extra('alerts', true, loadAlerts, saved?.alerts))

  const data: Forecast | null = base && {
    ...base,
    models: uncovered.length ? (models.data ?? (live ? null : base.models) ?? null) : null,
    details: inRange && gridUrl ? (details.data ?? (live ? null : base.details) ?? null) : null,
    alerts: alerts.data ?? (live ? null : base.alerts) ?? null,
  }

  // An enabled extra still showing its placeholder hasn't started fetching yet; it counts as busy.
  const extrasBusy =
    waiting(models, uncovered.length > 0) || waiting(details, inRange && !!gridUrl) || waiting(alerts, true)
  const busy = core.isFetching || (live && extrasBusy)

  // Save the full picture once a live fetch and all its extras have landed.
  const toSave = live && !core.isFetching && !extrasBusy && !preview ? data : null
  useEffect(() => {
    if (toSave) cache.write(toSave)
  }, [toSave])

  return {
    data,
    busy,
    // Model odds are still on their way (first load): those cards keep their skeleton instead of "not in the forecast yet".
    modelsLoading: waiting(models, uncovered.length > 0) && !models.data,
    error: core.isError ? core.error : null,
    saved: !!data && (!live || core.isError),
    refresh: () => {
      if (!busy) void qc.refetchQueries({ queryKey: ['nws'] })
    },
  }
}
