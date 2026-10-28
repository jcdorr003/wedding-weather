// National Weather Service (api.weather.gov): the official forecast, grid details and alerts for the venue.
import { POINT } from '../config'
import { HOUR, addDays, clock, durHours, nyAt } from '../time'
import type { Alert, Core, DailyPeriod, Details, HourlyPeriod, Points } from '../types'
import { FetchError, getJSON, parse } from './http'
import { AlertsSchema, ForecastSchema, GridSchema, type Layer, type Period, PointsSchema } from './schemas'

const NWS = 'https://api.weather.gov'
const lastSegment = (url: string | null | undefined) => url?.split('/').pop() || null

export const loadPoints = async (signal?: AbortSignal): Promise<Points> => {
  const p = parse(PointsSchema, await getJSON(`${NWS}/points/${POINT.lat},${POINT.lon}`, { signal })).properties
  if (!p.forecast || !p.forecastHourly) throw new FetchError('empty')
  return {
    grid: { office: p.gridId, x: p.gridX, y: p.gridY },
    forecastUrl: p.forecast,
    hourlyUrl: p.forecastHourly,
    gridUrl: p.forecastGridData || null,
    links: { radar: p.radarStation || null, zone: lastSegment(p.forecastZone), county: lastSegment(p.county) },
  }
}

const slimDaily = (p: Period): DailyPeriod => ({
  date: p.startTime.slice(0, 10),
  hour: Number(p.startTime.slice(11, 13)),
  isDaytime: p.isDaytime ?? false,
  temp: p.temperature,
  pop: p.probabilityOfPrecipitation?.value ?? 0,
  wind: p.windSpeed ?? '',
  dir: p.windDirection ?? '',
  sky: p.shortForecast ?? '',
  detail: p.detailedForecast ?? '',
})

const slimHourly = (p: Period): HourlyPeriod => ({
  t: Date.parse(p.startTime),
  date: p.startTime.slice(0, 10),
  hour: Number(p.startTime.slice(11, 13)),
  temp: p.temperature,
  pop: p.probabilityOfPrecipitation?.value ?? 0,
  wind: p.windSpeed ?? '',
  dir: p.windDirection ?? '',
  sky: p.shortForecast ?? '',
})

// Every shown day plus the next morning, so the evening block (7 PM–1 AM) has its last hour.
const nearDays = (days: readonly string[]) => new Set(days.flatMap((k) => [k, addDays(k, 1)]))

/** The 7-day and hourly forecasts, trimmed to the shown days. NWS dates its periods in local time. */
export const loadForecast = async (points: Points, days: readonly string[], signal?: AbortSignal): Promise<Core> => {
  const [daily, hourly] = await Promise.all(
    [points.forecastUrl, points.hourlyUrl].map(async (url) => parse(ForecastSchema, await getJSON(url, { signal }))),
  )
  const dp = daily?.properties.periods ?? []
  const hp = hourly?.properties.periods ?? []
  const lastDaily = dp.at(-1)
  const lastHourly = hp.at(-1)
  if (!daily || !lastDaily || !lastHourly) throw new FetchError('empty')
  const near = nearDays(days)

  return {
    fetchedAt: clock.now().toString(),
    grid: points.grid,
    issued: daily.properties.updateTime || daily.properties.generatedAt || null,
    dailyEnd: lastDaily.startTime.slice(0, 10),
    hourlyEnd: lastHourly.startTime,
    gridUrl: points.gridUrl,
    links: points.links,
    daily: dp.filter((p) => days.includes(p.startTime.slice(0, 10))).map(slimDaily),
    hourly: hp.filter((p) => near.has(p.startTime.slice(0, 10))).map(slimHourly),
  }
}

const splitValidTime = (validTime: string) => {
  const [start = '', duration] = validTime.split('/')
  return { t0: Date.parse(start), hours: durHours(duration) }
}

// Spread a grid layer over local hours: { 'YYYY-MM-DD|H': value }, shown days only.
const byHour = (layer: Layer, near: Set<string>) => {
  const out: Record<string, number> = {}
  for (const { validTime, value } of layer?.values ?? []) {
    if (value == null) continue
    const { t0, hours } = splitValidTime(validTime)
    for (let i = 0; i < hours; i++) {
      const { date, hour } = nyAt(t0 + i * HOUR)
      if (near.has(date)) out[`${date}|${hour}`] = value
    }
  }
  return out
}

/** Rain amounts (6-hour QPF blocks), gusts and thunder chances from the forecast grid. */
export const loadDetails = async (url: string, days: readonly string[], signal?: AbortSignal): Promise<Details> => {
  const g = parse(GridSchema, await getJSON(url, { signal })).properties
  const near = nearDays(days)
  const qpf = (g.quantitativePrecipitation?.values ?? [])
    .map(({ validTime, value }) => ({ ...splitValidTime(validTime), mm: value ?? 0 }))
    .filter((q) => near.has(nyAt(q.t0).date) || near.has(nyAt(q.t0 + q.hours * HOUR - 1).date))
  return { qpf, gustKmh: byHour(g.windGust, near), thunder: byHour(g.probabilityOfThunder, near) }
}

const SEVERITY: Record<string, number> = { Extreme: 0, Severe: 1, Moderate: 2, Minor: 3, Unknown: 4 }

/** Active watches, warnings and advisories for the venue (real alerts only, most severe first). */
export const loadAlerts = async (signal?: AbortSignal): Promise<Alert[]> => {
  const url = `${NWS}/alerts/active?point=${POINT.lat},${POINT.lon}`
  const res = parse(AlertsSchema, await getJSON(url, { tries: 2, signal }))
  return res.features
    .flatMap((f) => (f.properties ? [f.properties] : []))
    .filter((a) => a.status === 'Actual' && a.messageType !== 'Cancel')
    .map((a) => ({
      event: a.event ?? '',
      headline: a.headline || a.parameters?.NWSheadline?.[0] || '',
      severity: a.severity || 'Unknown',
      ends: a.ends || a.expires || null,
    }))
    .toSorted((x, y) => (SEVERITY[x.severity] ?? 4) - (SEVERITY[y.severity] ?? 4))
}
