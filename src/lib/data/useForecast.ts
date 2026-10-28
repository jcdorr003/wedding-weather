import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { todayNY } from '../time'
import type { Forecast } from '../types'
import { readSaved, writeSaved } from './cache'
import { alertsQuery, detailsQuery, forecastQuery, modelsQuery } from './queries'

type Pending = { isFetching: boolean; isPlaceholderData: boolean }
// An enabled extra still showing its placeholder hasn't started fetching yet; it counts as busy.
const waiting = (q: Pending, enabled: boolean) => enabled && (q.isFetching || q.isPlaceholderData)

/**
 * The forecast for `days`: a saved copy straight away (if any), then the live NWS forecast, then the extras.
 * `saved` is true while what's shown isn't from a live fetch this visit (or the latest refresh failed).
 */
type Options = { days: readonly string[]; preview: boolean; now: number; savedKey: string }

export const useForecast = ({ days, preview, now, savedKey }: Options) => {
  const client = useQueryClient()
  const [saved] = useState(() => (preview ? null : readSaved(savedKey)))

  const core = useQuery({
    ...forecastQuery(days),
    // A saved copy (with the extras it was saved with) shows first and is always refreshed straight away.
    initialData: saved ?? undefined,
    initialDataUpdatedAt: 0,
  })
  const live = core.isFetchedAfterMount && core.isSuccess
  const base: (Partial<Forecast> & NonNullable<typeof core.data>) | null = core.data ?? null
  const fetchedAt = base?.fetchedAt

  const today = todayNY(now)
  const uncovered = base ? days.filter((k) => k >= today && !base.daily.some((p) => p.date === k)) : []
  // Rain amounts, gusts and thunder only matter once a shown day is inside the 7-day forecast.
  const inRange = base ? days.some((k) => k >= today && k <= base.dailyEnd) : false
  const gridUrl = base?.gridUrl ?? null
  const wants = { models: uncovered.length > 0, details: inRange && !!gridUrl }

  const models = useQuery({
    ...modelsQuery(fetchedAt, uncovered, today),
    enabled: live && wants.models,
    placeholderData: (prev) => prev ?? saved?.models ?? null,
  })
  const details = useQuery({
    ...detailsQuery(fetchedAt, gridUrl, days),
    enabled: live && wants.details,
    placeholderData: (prev) => prev ?? saved?.details ?? null,
  })
  const alerts = useQuery({
    ...alertsQuery(fetchedAt),
    enabled: live,
    placeholderData: (prev) => prev ?? saved?.alerts ?? null,
  })

  // Before a live fetch lands, the saved copy's own extras stand in.
  const fallback = <K extends 'models' | 'details' | 'alerts'>(key: K) => (live ? null : (base?.[key] ?? null))
  const data: Forecast | null = base && {
    ...base,
    models: wants.models ? (models.data ?? fallback('models')) : null,
    details: wants.details ? (details.data ?? fallback('details')) : null,
    alerts: alerts.data ?? fallback('alerts'),
  }

  const extrasBusy = waiting(models, wants.models) || waiting(details, wants.details) || waiting(alerts, true)
  const busy = core.isFetching || (live && extrasBusy)

  // Save the full picture once a live fetch and all its extras have landed.
  const toSave = live && !core.isFetching && !extrasBusy && !preview ? data : null
  useEffect(() => {
    if (toSave) writeSaved(savedKey, toSave)
  }, [savedKey, toSave])

  return {
    data,
    busy,
    // Model odds still on their way: those cards keep their skeleton instead of "not in the forecast yet".
    modelsLoading: waiting(models, wants.models) && !models.data,
    error: core.isError ? core.error : null,
    saved: !!data && (!live || core.isError),
    refresh: () => {
      if (!busy) void client.refetchQueries({ queryKey: forecastQuery(days).queryKey })
    },
  }
}
