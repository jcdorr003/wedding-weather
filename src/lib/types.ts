// The shapes the page works with. Core + extras is also the saved-copy format in localStorage, so keep it stable.

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

export type Grid = { office: string; x: number; y: number }
export type Links = { radar: string | null; zone: string | null; county: string | null }

/** Where this spot's forecasts live, from NWS /points. Changes only if NWS redraws its grid. */
export type Points = { grid: Grid; forecastUrl: string; hourlyUrl: string; gridUrl: string | null; links: Links }

export type Core = {
  fetchedAt: string
  grid: Grid
  issued: string | null
  dailyEnd: string
  hourlyEnd: string
  gridUrl: string | null
  links: Links
  daily: DailyPeriod[]
  hourly: HourlyPeriod[]
}

export type Qpf = { t0: number; hours: number; mm: number }
export type Details = { qpf: Qpf[]; gustKmh: Record<string, number>; thunder: Record<string, number> }
export type Run = { name: string; wet: number; total: number }
export type Models = { days: Record<string, Run[]> }
export type Alert = { event: string; headline: string; severity: string; ends: string | null }

export type Forecast = Core & { models: Models | null; details: Details | null; alerts: Alert[] | null }
