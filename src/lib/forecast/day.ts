// What each day card shows. Pure: data and `now` in, plain values out.
import { HOUR, addDays, fmtDate, longDate, shortHour, todayNY, weekday } from '../time'
import type { DailyPeriod, Details, Forecast, Run } from '../types'
import { fmtInches, pct, windRange } from './format'

export type EarlyRead = { head: string; sub: string; runs: (Run & { share: number })[]; pending: string }
export type Part = { name: string; range: string; past: boolean; chance: number | null; amount: number | null }
export type Parts = { blocks: Part[]; total: string; totalFromNow: boolean; note: string | null }
export type FullDay = {
  kind: 'full'
  hi: string
  lo: string
  sky: string
  rain: string
  rainNight: string | null
  wind: string
  windSub: string | null
  detail: string
  thunder: string | null
  parts: Parts | null
  night: { sky: string; temp: number; wind: string } | null
}
export type DayCard =
  | FullDay
  | { kind: 'early'; read: EarlyRead }
  | { kind: 'passed' }
  | { kind: 'pending'; dailyEnd: string; when: string }
  | { kind: 'nodata' }

const KMH_PER_MPH = 1.609344

// The 7-day forecast and the ~156-hour hourly forecast both reach a date about six days ahead.
export const pendingWhen = (key: string, now: number) => {
  const expected = addDays(key, -6)
  return expected > todayNY(now)
    ? `should appear around ${longDate(expected)}`
    : 'should appear with the next NWS update'
}

export const dayCard = (key: string, data: Forecast | null, now: number): DayCard => {
  const periods = data?.daily.filter((p) => p.date === key) ?? []
  const day = periods.find((p) => p.isDaytime)
  // Between midnight and 6 AM the forecast opens with an "Overnight" period; that night's forecast is the one
  // starting in the evening.
  const night = periods.find((p) => !p.isDaytime && p.hour >= 12)
  const main: DailyPeriod | undefined = day ?? night

  if (!data || !main) {
    const runs = data?.models?.days[key]
    if (runs) return { kind: 'early', read: earlyRead(key, runs, now) }
    if (key < todayNY(now)) return { kind: 'passed' }
    if (!data) return { kind: 'nodata' }
    return {
      kind: 'pending',
      dailyEnd: fmtDate(data.dailyEnd, { weekday: 'short', month: 'short', day: 'numeric' }),
      when: `${weekday(key)} ${pendingWhen(key, now)}`,
    }
  }

  const { details } = data
  // Daytime gusts (6 AM–6 PM), shown only when clearly stronger than the steady wind.
  let gust: number | null = null
  if (details && day)
    for (let h = 6; h < 18; h++) {
      const kmh = details.gustKmh[`${key}|${h}`]
      if (kmh != null) gust = Math.max(gust ?? 0, kmh / KMH_PER_MPH)
    }
  const steady = Math.max(0, ...(main.wind.match(/\d+/g) ?? []).map(Number))
  const gustText = gust != null && Math.round(gust) >= steady + 5 ? ` · gusts to ${Math.round(gust)} mph` : ''
  let thunder = 0
  if (details) for (let h = 0; h < 24; h++) thunder = Math.max(thunder, details.thunder[`${key}|${h}`] ?? 0)

  return {
    kind: 'full',
    hi: day ? `${day.temp}°` : '—',
    lo: night ? `Low ${night.temp}°` : '',
    sky: main.sky,
    rain: pct(main.pop),
    rainNight: day && night ? `Night ${pct(night.pop)}` : null,
    wind: windRange(main.wind),
    windSub: main.dir || gustText ? `${main.dir ? `from ${main.dir}` : ''}${gustText}` : null,
    detail: main.detail,
    thunder: thunder >= 15 ? `Chance of thunder up to ${Math.round(thunder)}%.` : null,
    parts: partsOfDay(key, data, now),
    night: day && night ? { sky: night.sky, temp: night.temp, wind: windRange(night.wind) } : null,
  }
}

/** Rain amount in [a, b), only when NWS has 6-hour amounts that fit exactly inside it. Never estimated. */
export const blockAmount = (details: Details | null, a: number, b: number) => {
  if (!details) return null
  const qs = details.qpf.filter((q) => q.t0 < b && q.t0 + q.hours * HOUR > a)
  if (qs.some((q) => q.t0 < a || q.t0 + q.hours * HOUR > b)) return null
  if (qs.reduce((n, q) => n + q.hours, 0) < (b - a) / HOUR) return null
  return qs.reduce((n, q) => n + q.mm, 0)
}

const BLOCKS = ['Early', 'Morning', 'Afternoon', 'Evening'] as const

/** Four 6-hour blocks starting at 06:00 UTC (1 AM in November), lined up with NWS's rain-amount periods. */
export const partsOfDay = (key: string, data: Forecast, now: number): Parts | null => {
  const base = Temporal.Instant.from(`${key}T06:00:00Z`).epochMilliseconds
  const blocks = BLOCKS.map((name, i) => {
    const a = base + i * 6 * HOUR
    const b = a + 6 * HOUR
    const pops = data.hourly.filter((h) => h.t >= a && h.t < b).map((h) => h.pop)
    return {
      name,
      range: `${shortHour(a)}–${shortHour(b)}`,
      past: b <= now,
      chance: pops.length ? Math.max(...pops) : null,
      amount: blockAmount(data.details, a, b),
    }
  })
  if (blocks.every((x) => x.chance == null && x.amount == null)) return null

  const amounts = blocks.filter((x) => !x.past).map((x) => x.amount)
  const known = amounts.filter((x) => x != null)
  const allKnown = amounts.length > 0 && known.length === amounts.length
  const expected = addDays(key, -3)
  return {
    blocks,
    total: allKnown ? fmtInches(known.reduce((n, x) => n + x, 0)) : '',
    totalFromNow: blocks.some((x) => x.past),
    note: allKnown
      ? null
      : `NWS rain amounts come out about 3 days ahead${expected > todayNY(now) ? `, around ${longDate(expected)}` : ''}.`,
  }
}

// Each model counts equally, whatever its number of runs.
const runShare = (runs: Run[]) => (runs.reduce((a, r) => a + r.wet / r.total, 0) / runs.length) * 100
const inTen = (p: number) => {
  const tenths = Math.round(p / 10)
  return tenths === 0 ? 'Fewer than 1 in 10' : tenths === 10 ? 'Nearly all' : `About ${tenths} in 10`
}

/** Day-level odds from the model ensembles, for days beyond the NWS forecast. No amounts, no timing. */
export const earlyRead = (key: string, runs: Run[], now: number): EarlyRead => {
  const p = runShare(runs)
  return {
    head: p < 35 ? 'Leaning dry' : p <= 65 ? 'Could go either way' : 'Leaning wet',
    sub: `${inTen(p)} model runs show rain that day. Confidence is low this far out, so expect this to shift.`,
    runs: runs.map((r) => ({ ...r, share: (r.wet / r.total) * 100 })),
    pending: `The official NWS forecast for ${weekday(key)} ${pendingWhen(key, now)}.`,
  }
}
