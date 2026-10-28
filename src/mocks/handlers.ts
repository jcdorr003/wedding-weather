// MOCK DATA: local preview and tests only. Made-up NWS and Open-Meteo responses, ported from dev/mock-data.js
// so the six scenarios match the vanilla page's mock exactly.
import { HttpResponse, delay, http } from 'msw'
import { clock } from '../lib/time'

import type { Scenario } from './scenarios'

const iso = (date: string, h: number) =>
  `${date}T${String(h).padStart(2, '0')}:00:00${date < '2026-11-01' ? '-04:00' : '-05:00'}`
const dateRange = (from: string, to: string) => {
  const out: string[] = []
  for (
    let d = Temporal.PlainDate.from(from);
    Temporal.PlainDate.compare(d, Temporal.PlainDate.from(to)) <= 0;
    d = d.add({ days: 1 })
  )
    out.push(d.toString())
  return out
}
const sky = (pop: number) =>
  pop >= 60
    ? 'Rain Showers Likely'
    : pop >= 30
      ? 'Chance Rain Showers'
      : pop >= 20
        ? 'Slight Chance Rain Showers'
        : 'Partly Sunny'
const nowIso = (minus = 0) => new Date(clock.nowMs() - minus).toISOString()

type Day = {
  hi: number
  lo: number
  popD: number
  popN: number
  wind: string
  dir: string
  skyD: string
  skyN: string
  detail: string
}
const DAYS: Record<string, Day> = {
  '2026-11-05': {
    hi: 58,
    lo: 49,
    popD: 70,
    popN: 60,
    wind: '10 to 15 mph',
    dir: 'S',
    skyD: 'Rain Showers Likely',
    skyN: 'Showers Likely',
    detail:
      'Showers likely, mainly after 11am. Cloudy, with a high near 58. South wind 10 to 15 mph. Chance of precipitation is 70%. New rainfall amounts between a quarter and half of an inch possible.',
  },
  '2026-11-06': {
    hi: 55,
    lo: 44,
    popD: 40,
    popN: 5,
    wind: '10 to 20 mph',
    dir: 'NW',
    skyD: 'Chance Rain Showers then Partly Sunny',
    skyN: 'Mostly Clear',
    detail:
      'A chance of rain showers before 11am. Partly sunny, with a high near 55. Northwest wind 10 to 20 mph, with gusts as high as 28 mph. Chance of precipitation is 40%.',
  },
  '2026-11-07': {
    hi: 59,
    lo: 47,
    popD: 5,
    popN: 3,
    wind: '5 to 10 mph',
    dir: 'W',
    skyD: 'Sunny',
    skyN: 'Clear',
    detail: 'Sunny, with a high near 59. West wind 5 to 10 mph.',
  },
}
const HOURLY: Record<string, number[]> = {
  '2026-11-05': [8, 8, 9, 9, 10, 10, 12, 18, 30, 45, 55, 62, 68, 70, 72, 70, 66, 62, 60, 58, 52, 48, 50, 55],
  '2026-11-06': [62, 64, 60, 58, 55, 52, 48, 44, 38, 31, 24, 21, 16, 12, 9, 7, 5, 4, 3, 3, 2, 2, 2, 2],
  '2026-11-07': [2, 2, 2, 1, 1, 1, 2, 3, 4, 5, 5, 6, 6, 5, 4, 4, 3, 3, 3, 2, 2, 2, 2, 2],
}
const TEMPS: Record<string, number[]> = {
  '2026-11-06': [50, 49, 49, 48, 48, 47, 47, 48, 49, 50, 52, 53, 54, 55, 55, 54, 53, 51, 49, 48, 47, 46, 45, 44],
  '2026-11-07': [44, 43, 43, 42, 42, 42, 43, 45, 48, 51, 54, 56, 58, 59, 59, 58, 56, 54, 52, 51, 50, 49, 48, 47],
}
const FALLBACK_DAY: Day = {
  hi: 62,
  lo: 50,
  popD: 10,
  popN: 10,
  wind: '5 to 10 mph',
  dir: 'W',
  skyD: 'Partly Sunny',
  skyN: 'Partly Cloudy',
  detail: 'Partly sunny, with a high near 62.',
}

type DailyOpts = { from?: string; overnight?: boolean; issued?: string }
const daily = (throughDate: string, { from = '2026-10-27', overnight = false, issued }: DailyOpts = {}) => {
  const periods: object[] = []
  if (overnight)
    periods.push({
      name: 'Overnight',
      startTime: iso(from, 2),
      isDaytime: false,
      temperature: 41,
      probabilityOfPrecipitation: { value: 12 },
      windSpeed: '5 mph',
      windDirection: 'NW',
      shortForecast: 'Mostly Clear',
      detailedForecast: '',
    })
  for (const date of dateRange(from, throughDate)) {
    const d = DAYS[date] ?? FALLBACK_DAY
    const wd = Temporal.PlainDate.from(date).toLocaleString('en-US', { weekday: 'long' })
    periods.push({
      name: wd,
      startTime: iso(date, 6),
      isDaytime: true,
      temperature: d.hi,
      probabilityOfPrecipitation: { value: d.popD },
      windSpeed: d.wind,
      windDirection: d.dir,
      shortForecast: d.skyD,
      detailedForecast: d.detail,
    })
    periods.push({
      name: `${wd} Night`,
      startTime: iso(date, 18),
      isDaytime: false,
      temperature: d.lo,
      probabilityOfPrecipitation: { value: d.popN },
      windSpeed: '5 mph',
      windDirection: d.dir,
      shortForecast: d.skyN,
      detailedForecast: '',
    })
  }
  return { properties: { updateTime: issued ?? nowIso(40 * 60000), periods } }
}

type HourlyOpts = { from?: string; fromHour?: number }
const hourly = (throughDate: string, throughHour = 23, { from = '2026-10-27', fromHour = 0 }: HourlyOpts = {}) => {
  const periods: object[] = []
  for (const date of dateRange(from, throughDate)) {
    for (let h = date === from ? fromHour : 0; h < 24; h++) {
      if (date === throughDate && h > throughHour) break
      const pop = HOURLY[date]?.[h] ?? 8
      const t = TEMPS[date]?.[h] ?? 55
      periods.push({
        startTime: iso(date, h),
        temperature: t,
        probabilityOfPrecipitation: { value: pop },
        windSpeed: pop > 30 ? '15 mph' : '8 mph',
        windDirection: 'NW',
        shortForecast: sky(pop),
      })
    }
  }
  return { properties: { updateTime: nowIso(), periods } }
}

// Ensemble runs: share of runs that are wet per day for each model.
const ensemble = (url: URL) => {
  const dates = dateRange(url.searchParams.get('start_date') ?? '', url.searchParams.get('end_date') ?? '')
  const wetShare: Record<string, [number, number]> = {
    '2026-11-05': [0.68, 0.74],
    '2026-11-06': [0.42, 0.47],
    '2026-11-07': [0.19, 0.24],
  }
  const time = dates.flatMap((d) => Array.from({ length: 24 }, (_, h) => `${d}T${String(h).padStart(2, '0')}:00`))
  const out: Record<string, unknown> = { time }
  for (const [tag, n, m] of [
    ['ncep_gefs_seamless', 31, 0],
    ['ecmwf_ifs025_ensemble', 51, 1],
  ] as const) {
    for (let i = 0; i < n; i++) {
      const key = i === 0 ? `precipitation_${tag}` : `precipitation_member${String(i).padStart(2, '0')}_${tag}`
      out[key] = time.map((t) => {
        const share = (wetShare[t.slice(0, 10)] ?? [0.1, 0.1])[m]
        const hour = Number(t.slice(11, 13))
        const wetRuns = Math.round(share * n)
        return i < wetRuns && hour >= 9 && hour < 15 ? (i < wetRuns / 2 ? 0.06 : 0.03) : 0
      })
    }
  }
  return { hourly: out }
}

// Rain amounts (mm) per 6-hour block starting 06Z (1 AM EST): early, morning, afternoon, evening.
const QPF: Record<string, number[]> = {
  '2026-11-05': [0, 3.8, 6.4, 2.5],
  '2026-11-06': [2.0, 0.8, 0, 0],
  '2026-11-07': [0, 0, 0, 0],
}
const grid = (qpfThrough: string) => {
  const qpf: object[] = []
  for (const [date, blocks] of Object.entries(QPF)) {
    blocks.forEach((mm, i) => {
      const start = Date.parse(`${date}T06:00:00Z`) + i * 6 * 3600e3
      if (start + 6 * 3600e3 <= Date.parse(qpfThrough))
        qpf.push({ validTime: `${new Date(start).toISOString().replace('.000Z', '+00:00')}/PT6H`, value: mm })
    })
  }
  const gust = [
    { validTime: '2026-11-06T11:00:00+00:00/PT12H', value: 45 }, // Fri 6 AM–6 PM: 28 mph
    { validTime: '2026-11-07T11:00:00+00:00/PT12H', value: 22 }, // Sat: light
  ]
  const thunder = [{ validTime: '2026-11-05T17:00:00+00:00/PT6H', value: 20 }] // Thu midday
  return {
    properties: {
      updateTime: nowIso(),
      quantitativePrecipitation: { values: qpf },
      windGust: { values: gust },
      probabilityOfThunder: { values: thunder },
    },
  }
}

const ALERTS: Partial<Record<Scenario, object[]>> = {
  saturday: [
    {
      properties: {
        status: 'Actual',
        messageType: 'Alert',
        event: 'Wind Advisory',
        severity: 'Moderate',
        ends: '2026-11-07T18:00:00-05:00',
        headline: 'Wind Advisory issued November 7 at 4:12AM EST until November 7 at 6:00PM EST by NWS Upton NY',
        parameters: { NWSheadline: ['WIND ADVISORY IN EFFECT UNTIL 6 PM EST THIS EVENING'] },
      },
    },
  ],
}

type Coverage = { daily: [string, DailyOpts?]; hourly: [string, number, HourlyOpts?]; qpf?: string }
const COVERAGE: Record<Exclude<Scenario, 'down'>, Coverage> = {
  wedding: {
    daily: ['2026-11-10', { from: '2026-11-04' }],
    hourly: ['2026-11-10', 23, { from: '2026-11-04', fromHour: 18 }],
    qpf: '2026-11-08T06:00:00Z',
  },
  today: { daily: ['2026-11-02'], hourly: ['2026-11-02', 20] },
  halfway: {
    daily: ['2026-11-06', { from: '2026-10-31' }],
    hourly: ['2026-11-06', 15, { from: '2026-10-31', fromHour: 10 }],
    qpf: '2026-11-03T18:00:00Z',
  },
  saturday: {
    daily: ['2026-11-13', { from: '2026-11-07' }],
    hourly: ['2026-11-13', 23, { from: '2026-11-07', fromHour: 9 }],
    qpf: '2026-11-10T18:00:00Z',
  },
  overnight: {
    daily: ['2026-11-13', { from: '2026-11-07', overnight: true, issued: '2026-11-06T20:00:00Z' }],
    hourly: ['2026-11-13', 23, { from: '2026-11-07', fromHour: 2 }],
    qpf: '2026-11-10T12:00:00Z',
  },
}

const NWS = 'https://api.weather.gov'

/** Request handlers for one scenario. `latency` is how long each response takes (long enough to see loading states). */
export const handlersFor = (scenario: Scenario, { latency = 700 } = {}) => {
  const wait = () => (latency ? delay(latency) : undefined)
  if (scenario === 'down') {
    return [
      http.all(`${NWS}/*`, async () => (await wait(), new HttpResponse(null, { status: 503 }))),
      http.get(
        'https://ensemble-api.open-meteo.com/v1/ensemble',
        async ({ request }) => (await wait(), HttpResponse.json(ensemble(new URL(request.url)))),
      ),
    ]
  }
  const c = COVERAGE[scenario]
  return [
    http.get(`${NWS}/points/:point`, async () => {
      await wait()
      return HttpResponse.json({
        properties: {
          gridId: 'OKX',
          gridX: 35,
          gridY: 40,
          forecast: `${NWS}/mock/forecast`,
          forecastHourly: `${NWS}/mock/forecast/hourly`,
          forecastGridData: `${NWS}/mock/grid`,
          forecastZone: `${NWS}/zones/forecast/NYZ075`,
          county: `${NWS}/zones/county/NYC047`,
          radarStation: 'KDIX',
        },
      })
    }),
    http.get(
      `${NWS}/alerts/active`,
      async () => (await wait(), HttpResponse.json({ features: ALERTS[scenario] ?? [] })),
    ),
    http.get(`${NWS}/mock/grid`, async () => (await wait(), HttpResponse.json(grid(c.qpf ?? '2000-01-01T00:00:00Z')))),
    http.get(`${NWS}/mock/forecast/hourly`, async () => (await wait(), HttpResponse.json(hourly(...c.hourly)))),
    http.get(`${NWS}/mock/forecast`, async () => (await wait(), HttpResponse.json(daily(...c.daily)))),
    http.get(
      'https://ensemble-api.open-meteo.com/v1/ensemble',
      async ({ request }) => (await wait(), HttpResponse.json(ensemble(new URL(request.url)))),
    ),
  ]
}
