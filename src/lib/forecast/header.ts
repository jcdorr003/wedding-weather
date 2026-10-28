// The page header and status lines.
import { fmtDate, fmtIssued, fmtStamp, shortDate, weekday } from '../time'
import type { Alert, Forecast } from '../types'

/** "Thursday–Saturday, November 5–7" */
export const title = (days: readonly string[]) => {
  const [a = '', , c = ''] = days
  const sameMonth = a.slice(0, 7) === c.slice(0, 7)
  const span = sameMonth
    ? `${fmtDate(a, { month: 'long' })} ${Number(a.slice(8))}–${Number(c.slice(8))}`
    : `${shortDate(a)} – ${shortDate(c)}`
  return `${weekday(a)}–${weekday(c)}, ${span}`
}

export const stamp = (data: Forecast | null, saved: boolean, now: number) => {
  if (!data) return 'No forecast loaded yet'
  const issued = data.issued ? ` · NWS forecast issued ${fmtIssued(data.issued, now)}` : ''
  return `${saved ? 'Saved copy from' : 'Updated'} ${fmtStamp(data.fetchedAt)}${issued}`
}

export const activeAlerts = (alerts: Alert[] | null | undefined, now: number) =>
  (alerts ?? []).filter((a) => !a.ends || Date.parse(a.ends) > now)

export const previewLine = (days: readonly string[]) =>
  `Preview mode: showing ${days.map(shortDate).join(', ')} instead of the wedding days. Remove “?days=…” from the address to switch back.`

export const noDataText = (loadFailed: boolean) =>
  loadFailed ? 'Couldn’t load the forecast. Tap Refresh Data to try again.' : 'Loading the forecast…'
