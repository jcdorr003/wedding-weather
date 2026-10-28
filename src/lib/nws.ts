import * as z from 'zod/mini'
import { CACHE_KEY, ENSEMBLES, POINT, TZ, WET_INCHES } from './config'
import { HOUR, addDays, clock, durHours, nyAt, todayNY } from './time'

// ---- shapes the page works with (also the saved-copy format in localStorage) ----
export type DailyPeriod = {
  date: string
  hour: number
  isDaytime: boolean
  temp: number
  pop: number
  wind: string
  dir: string
  sky: string
  detail: string
}
export type HourlyPeriod = {
  t: number
  date: string
  hour: number
  temp: number
  pop: number
  wind: string
  dir: string
  sky: string
}
export type Core = {
  fetchedAt: string
  grid: { office: string; x: number; y: number }
  issued: string | null
  dailyEnd: string
  hourlyEnd: string
  gridUrl: string | null
  links: { radar: string | null; zone: string | null; county: string | null }
  daily: DailyPeriod[]
  hourly: HourlyPeriod[]
}
export type Qpf = { t0: number; hours: number; mm: number }
export type Details = { qpf: Qpf[]; gustKmh: Record<string, number>; thunder: Record<string, number> }
export type Run = { name: string; wet: number; total: number }
export type Models = { days: Record<string, Run[]> }
export type Alert = { event: string; headline: string; severity: string; ends: string | null }
export type Forecast = Core & { models: Models | null; details: Details | null; alerts: Alert[] | null }

// ---- fetching ----
export class FetchError extends Error {
  constructor(
    readonly kind: 'http' | 'timeout' | 'network' | 'empty',
    readonly status?: number,
  ) {
    super(kind)
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function getJSON(url: string, { tries = 3, accept = 'application/geo+json' } = {}): Promise<unknown> {
  let last: FetchError = new FetchError('network')
  for (let i = 0; i < tries; i++) {
    if (i) await sleep(800 * i)
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 15000)
    try {
      const res = await fetch(url, { headers: { Accept: accept }, cache: 'no-store', signal: ctrl.signal })
      if (!res.ok) {
        last = new FetchError('http', res.status)
        if (res.status < 500 && res.status !== 429) break
        continue
      }
      return await res.json()
    } catch (e) {
      last =
        e instanceof FetchError
          ? e
          : new FetchError(e instanceof Error && e.name === 'AbortError' ? 'timeout' : 'network')
    } finally {
      clearTimeout(timer)
    }
  }
  throw last
}

// Validate only what the page reads; anything else NWS adds is ignored. A shape mismatch reads as an incomplete forecast.
function parse<T>(schema: z.ZodMiniType<T>, value: unknown): T {
  const r = schema.safeParse(value)
  if (!r.success) throw new FetchError('empty')
  return r.data
}

const str = z.nullish(z.string())
const num = z.nullish(z.number())
const PointsSchema = z.object({
  properties: z.object({
    gridId: z.string(),
    gridX: z.number(),
    gridY: z.number(),
    forecast: str,
    forecastHourly: str,
    forecastGridData: str,
    radarStation: str,
    forecastZone: str,
    county: str,
  }),
})
const PeriodSchema = z.object({
  startTime: z.string(),
  isDaytime: z.optional(z.boolean()),
  temperature: z.number(),
  probabilityOfPrecipitation: z.nullish(z.object({ value: num })),
  windSpeed: str,
  windDirection: str,
  shortForecast: str,
  detailedForecast: str,
})
const ForecastSchema = z.object({
  properties: z.object({ updateTime: str, generatedAt: str, periods: z.array(PeriodSchema) }),
})
type Period = z.infer<typeof PeriodSchema>
const LayerSchema = z.nullish(z.object({ values: z.array(z.object({ validTime: z.string(), value: num })) }))
const GridSchema = z.object({
  properties: z.object({
    quantitativePrecipitation: LayerSchema,
    windGust: LayerSchema,
    probabilityOfThunder: LayerSchema,
  }),
})
const EnsembleSchema = z.object({
  hourly: z.catchall(z.object({ time: z.array(z.string()) }), z.array(z.nullable(z.number()))),
})
const AlertsSchema = z.object({
  features: z.array(
    z.object({
      properties: z.nullish(
        z.object({
          status: str,
          messageType: str,
          event: str,
          headline: str,
          severity: str,
          ends: str,
          expires: str,
          parameters: z.nullish(z.object({ NWSheadline: z.nullish(z.array(z.string())) })),
        }),
      ),
    }),
  ),
})

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

export async function loadFromNWS(days: readonly string[]): Promise<Core> {
  const pp = parse(PointsSchema, await getJSON(`https://api.weather.gov/points/${POINT.lat},${POINT.lon}`)).properties
  if (!pp.forecast || !pp.forecastHourly) throw new FetchError('empty')

  const [daily, hourly] = (await Promise.all([getJSON(pp.forecast), getJSON(pp.forecastHourly)])).map((j) =>
    parse(ForecastSchema, j),
  ) as [z.infer<typeof ForecastSchema>, z.infer<typeof ForecastSchema>]
  const dp = daily.properties.periods
  const hp = hourly.properties.periods
  const lastDaily = dp.at(-1)
  const lastHourly = hp.at(-1)
  if (!lastDaily || !lastHourly) throw new FetchError('empty')
  const near = nearDays(days)

  return {
    fetchedAt: clock.now().toString(),
    grid: { office: pp.gridId, x: pp.gridX, y: pp.gridY },
    issued: daily.properties.updateTime || daily.properties.generatedAt || null,
    dailyEnd: lastDaily.startTime.slice(0, 10),
    hourlyEnd: lastHourly.startTime,
    gridUrl: pp.forecastGridData || null,
    links: {
      radar: pp.radarStation || null,
      zone:
        String(pp.forecastZone ?? '')
          .split('/')
          .pop() || null,
      county:
        String(pp.county ?? '')
          .split('/')
          .pop() || null,
    },
    daily: dp.filter((p) => days.includes(p.startTime.slice(0, 10))).map(slimDaily),
    hourly: hp.filter((p) => near.has(p.startTime.slice(0, 10))).map(slimHourly),
  }
}

// ---- NWS detailed grid: rain amounts, gusts, thunder ----
type Layer = z.infer<typeof LayerSchema>

// Spread a grid layer over local hours: { 'YYYY-MM-DD|H': value }, shown days only.
function byHour(layer: Layer, near: Set<string>) {
  const out: Record<string, number> = {}
  for (const { validTime, value } of layer?.values ?? []) {
    const [start = '', dur] = validTime.split('/')
    const t0 = Date.parse(start)
    const n = durHours(dur)
    for (let i = 0; i < n; i++) {
      const { date, hour } = nyAt(t0 + i * HOUR)
      if (near.has(date) && value != null) out[`${date}|${hour}`] = value
    }
  }
  return out
}

export async function loadDetails(url: string, days: readonly string[]): Promise<Details> {
  const g = parse(GridSchema, await getJSON(url)).properties
  const near = nearDays(days)
  const qpf = (g.quantitativePrecipitation?.values ?? [])
    .map(({ validTime, value }) => {
      const [start = '', dur] = validTime.split('/')
      return { t0: Date.parse(start), hours: durHours(dur), mm: value ?? 0 }
    })
    .filter((q) => near.has(nyAt(q.t0).date) || near.has(nyAt(q.t0 + q.hours * HOUR - 1).date))
  return { qpf, gustKmh: byHour(g.windGust, near), thunder: byHour(g.probabilityOfThunder, near) }
}

// ---- Open-Meteo ensembles: share of rainy runs per day, for days the NWS forecast doesn't reach yet ----
export async function loadModels(keys: readonly string[]): Promise<Models | null> {
  const first = keys[0]
  const end = keys.at(-1)
  if (!first || !end) return null
  const today = todayNY()
  const start = first > today ? first : today
  if (start > end) return null
  const q = new URLSearchParams({
    latitude: String(POINT.lat),
    longitude: String(POINT.lon),
    hourly: 'precipitation',
    models: 'gfs_seamless,ecmwf_ifs025',
    precipitation_unit: 'inch',
    timezone: TZ,
    start_date: start,
    end_date: end,
  })
  const json = await getJSON(`https://ensemble-api.open-meteo.com/v1/ensemble?${q}`, {
    tries: 2,
    accept: 'application/json',
  })
  const h = parse(EnsembleSchema, json).hourly
  const series = Object.entries(h).filter((e): e is [string, (number | null)[]] => e[0] !== 'time')

  const days: Record<string, Run[]> = {}
  for (const key of keys) {
    const idx = h.time.flatMap((t, i) => (t.startsWith(key) ? [i] : []))
    if (!idx.length) continue
    const runs = ENSEMBLES.map((m) => {
      let wet = 0
      let total = 0
      for (const [k, values] of series) {
        if (!k.startsWith('precipitation') || !k.includes(m.match)) continue
        const vals = idx.map((i) => values[i]).filter((v): v is number => v != null)
        if (vals.length < idx.length * 0.75) continue
        total++
        if (vals.reduce((a, b) => a + b, 0) >= WET_INCHES) wet++
      }
      return { name: m.name, wet, total }
    }).filter((r) => r.total)
    if (runs.length) days[key] = runs
  }
  return { days }
}

// ---- NWS watches, warnings and advisories for this spot ----
const SEVERITY: Record<string, number> = { Extreme: 0, Severe: 1, Moderate: 2, Minor: 3, Unknown: 4 }

export async function loadAlerts(): Promise<Alert[]> {
  const res = parse(
    AlertsSchema,
    await getJSON(`https://api.weather.gov/alerts/active?point=${POINT.lat},${POINT.lon}`, { tries: 2 }),
  )
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

// ---- saved copy (per-device convenience only) ----
const SavedSchema = z.looseObject({ fetchedAt: z.string(), daily: z.array(z.unknown()), hourly: z.array(z.unknown()) })

export const cache = {
  read(): Forecast | null {
    try {
      const v: unknown = JSON.parse(localStorage.getItem(CACHE_KEY) ?? 'null')
      return SavedSchema.safeParse(v).success ? (v as Forecast) : null
    } catch {
      return null
    }
  },
  write(v: Forecast) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(v))
    } catch {
      /* private mode etc. */
    }
  },
}

export function friendlyError(e: unknown) {
  if (navigator.onLine === false) return 'Your device looks offline. Reconnect, then tap Refresh Data.'
  const err = e instanceof FetchError ? e : null
  if (err?.kind === 'timeout')
    return 'The National Weather Service is responding slowly right now. Tap Refresh Data again in a minute.'
  if (err?.kind === 'http' && err.status != null && (err.status >= 500 || err.status === 429))
    return 'The National Weather Service forecast server is temporarily unavailable. This happens now and then; try again in a few minutes.'
  if (err?.kind === 'http')
    return `The National Weather Service returned an unexpected response (error ${err.status}). Try again later.`
  if (err?.kind === 'empty') return 'The forecast came back incomplete. Tap Refresh Data to try again.'
  return 'Couldn’t reach the National Weather Service. Check your connection and tap Refresh Data.'
}
