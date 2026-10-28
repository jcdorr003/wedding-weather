// What the page shows, worked out from the forecast data. Pure functions; the components only lay it out.
import { THRESHOLD } from './config'
import type { Alert, DailyPeriod, Details, Forecast, HourlyPeriod, Run } from './nws'
import {
  HOUR,
  addDays,
  clock,
  fmtDate,
  fmtIssued,
  fmtStamp,
  hourLabel,
  longDate,
  nowHourNY,
  shortDate,
  shortHour,
  todayNY,
  weekday,
} from './time'

export const windRange = (w: string | null | undefined) => String(w ?? '').replace(/(\d+)\s+to\s+(\d+)/, '$1–$2')
export const pct = (v: number | null | undefined) => `${Math.round(v ?? 0)}%`
export const fmtInches = (mm: number) =>
  mm === 0 ? 'None' : mm / 25.4 < 0.01 ? '<0.01 in' : `${(mm / 25.4).toFixed(2)} in`

export function title(days: readonly string[]) {
  const [a = '', , c = ''] = days
  const sameMonth = a.slice(0, 7) === c.slice(0, 7)
  const span = sameMonth
    ? `${fmtDate(a, { month: 'long' })} ${Number(a.slice(8))}–${Number(c.slice(8))}`
    : `${shortDate(a)} – ${shortDate(c)}`
  return `${weekday(a)}–${weekday(c)}, ${span}`
}

// The 7-day forecast and the ~156-hour hourly forecast both reach a date about six days ahead.
export function pendingWhen(key: string) {
  const expected = addDays(key, -6)
  return expected > todayNY() ? `should appear around ${longDate(expected)}` : 'should appear with the next NWS update'
}

export const noDataText = (loadFailed: boolean) =>
  loadFailed ? 'Couldn’t load the forecast. Tap Refresh Data to try again.' : 'Loading the forecast…'

// ---- day cards ----
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

export function dayCard(key: string, data: Forecast | null): DayCard {
  const periods = data ? data.daily.filter((p) => p.date === key) : []
  const day = periods.find((p) => p.isDaytime)
  // Between midnight and 6 AM the forecast opens with an "Overnight" period; that night's forecast is the one starting in the evening.
  const night = periods.find((p) => !p.isDaytime && (p.hour ?? 18) >= 12)

  const main: DailyPeriod | undefined = day ?? night
  if (!data || !main) {
    const runs = data?.models?.days?.[key]
    if (runs) return { kind: 'early', read: earlyRead(key, runs) }
    if (key < todayNY()) return { kind: 'passed' }
    if (data)
      return {
        kind: 'pending',
        dailyEnd: fmtDate(data.dailyEnd, { weekday: 'short', month: 'short', day: 'numeric' }),
        when: `${weekday(key)} ${pendingWhen(key)}`,
      }
    return { kind: 'nodata' }
  }

  // Daytime gusts (6 AM–6 PM), shown only when clearly stronger than the steady wind.
  let gust: number | null = null
  if (data.details && day)
    for (let h = 6; h < 18; h++) {
      const v = data.details.gustKmh[`${key}|${h}`]
      if (v != null) gust = Math.max(gust ?? 0, v / 1.609344)
    }
  const steady = Math.max(0, ...(String(main.wind).match(/\d+/g) ?? []).map(Number))
  const gustText = gust != null && Math.round(gust) >= steady + 5 ? ` · gusts to ${Math.round(gust)} mph` : ''
  let thunder = 0
  if (data.details) for (let h = 0; h < 24; h++) thunder = Math.max(thunder, data.details.thunder[`${key}|${h}`] ?? 0)

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
    parts: partsOfDay(key, data),
    night: day && night ? { sky: night.sky, temp: night.temp, wind: windRange(night.wind) } : null,
  }
}

// Rain amount in [a, b), only when NWS has 6-hour amounts that fit exactly inside it.
export function blockAmount(details: Details | null, a: number, b: number) {
  if (!details) return null
  const qs = details.qpf.filter((q) => q.t0 < b && q.t0 + q.hours * HOUR > a)
  if (qs.some((q) => q.t0 < a || q.t0 + q.hours * HOUR > b)) return null
  if (qs.reduce((n, q) => n + q.hours, 0) < (b - a) / HOUR) return null
  return qs.reduce((n, q) => n + q.mm, 0)
}

// Four 6-hour blocks starting at 06:00 UTC (1 AM in November), lined up with NWS's rain-amount periods.
export function partsOfDay(key: string, data: Forecast): Parts | null {
  const names = ['Early', 'Morning', 'Afternoon', 'Evening']
  const base = Temporal.Instant.from(`${key}T06:00:00Z`).epochMilliseconds
  const now = clock.nowMs()
  const blocks = names.map((name, i) => {
    const a = base + i * 6 * HOUR
    const b = a + 6 * HOUR
    const hrs = data.hourly.filter((h) => h.t >= a && h.t < b)
    return {
      name,
      range: `${shortHour(a)}–${shortHour(b)}`,
      past: b <= now,
      chance: hrs.length ? Math.max(...hrs.map((h) => h.pop)) : null,
      amount: blockAmount(data.details, a, b),
    }
  })
  if (blocks.every((x) => x.chance == null && x.amount == null)) return null

  const amounts = blocks.filter((x) => !x.past).map((x) => x.amount)
  const allKnown = amounts.length > 0 && amounts.every((x) => x != null)
  const total = allKnown ? fmtInches(amounts.reduce<number>((n, x) => n + (x ?? 0), 0)) : ''
  const expected = addDays(key, -3)
  const note = allKnown
    ? null
    : `NWS rain amounts come out about 3 days ahead${expected > todayNY() ? `, around ${longDate(expected)}` : ''}.`
  return { blocks, total, totalFromNow: blocks.some((x) => x.past), note }
}

// Each model counts equally, whatever its number of runs.
const runShare = (runs: Run[]) => (runs.reduce((a, r) => a + r.wet / r.total, 0) / runs.length) * 100
const inTen = (p: number) => {
  const t = Math.round(p / 10)
  return t === 0 ? 'Fewer than 1 in 10' : t === 10 ? 'Nearly all' : `About ${t} in 10`
}

export function earlyRead(key: string, runs: Run[]): EarlyRead {
  const p = runShare(runs)
  return {
    head: p < 35 ? 'Leaning dry' : p <= 65 ? 'Could go either way' : 'Leaning wet',
    sub: `${inTen(p)} model runs show rain that day. Confidence is low this far out, so expect this to shift.`,
    runs: runs.map((r) => ({ ...r, share: (r.wet / r.total) * 100 })),
    pending: `The official NWS forecast for ${weekday(key)} ${pendingWhen(key)}.`,
  }
}

// ---- hourly timelines ----
export function hoursFor(key: string, data: Forecast | null) {
  const hours: (HourlyPeriod | null)[] = Array.from({ length: 24 }, () => null)
  if (data) for (const h of data.hourly) if (h.date === key && !hours[h.hour]) hours[h.hour] = h
  return hours
}

// Hours before this one have already happened (NWS only forecasts from the current hour on).
export const pastBefore = (key: string) => (key < todayNY() ? 24 : key === todayNY() ? nowHourNY() : 0)

export type Verdict = { head: string; sub: string; clearAt?: number }

export function verdict(hours: (HourlyPeriod | null)[]): Verdict | null {
  const have = hours.flatMap((h, i) => (h ? [i] : []))
  const first = have[0]
  const last = have.at(-1)
  if (first == null || last == null) return null
  const pop = (i: number) => hours[i]?.pop ?? 0
  const endsEarly = last < 23 // the forecast hasn't reached the end of this day yet
  const startsLate = first > 0 // earlier hours of this day have already passed
  const peakI = have.reduce((a, b) => (pop(b) > pop(a) ? b : a))
  const peak = pop(peakI) > 0 ? ` Peak ${pct(pop(peakI))} at ${hourLabel(peakI)}.` : ''
  const endsNote = endsEarly ? ` Hourly data currently ends at ${hourLabel(last)}.` : ''
  const wet = have.filter((i) => pop(i) >= THRESHOLD)
  const firstWet = wet[0]
  const lastWet = wet.at(-1)

  if (firstWet == null || lastWet == null) {
    const head = endsEarly ? 'Dry so far' : startsLate ? 'Dry the rest of the day' : 'Dry all day'
    return {
      head,
      sub: `Rain chance stays under ${THRESHOLD}% every ${startsLate ? 'remaining ' : ''}hour.${peak}${endsNote}`,
    }
  }
  if (lastWet === last) {
    return endsEarly
      ? {
          head: `Still ${pct(pop(last))} at ${hourLabel(last)}`,
          sub: `The hourly forecast ends before the rain chance drops below ${THRESHOLD}%.${peak}`,
        }
      : {
          head: `Still ${pct(pop(23))} at 11 PM`,
          sub: `Rain chance doesn’t drop below ${THRESHOLD}% before midnight.${peak}`,
        }
  }
  const span =
    firstWet === lastWet ? `at ${hourLabel(firstWet)}` : `between ${hourLabel(firstWet)} and ${hourLabel(lastWet)}`
  return {
    head: `Dry from ${hourLabel(lastWet + 1)}`,
    sub: `Rain chance reaches ${THRESHOLD}% or more ${span}, then stays under ${THRESHOLD}%.${peak}${endsNote}`,
    clearAt: lastWet + 1,
  }
}

// ---- header bits ----
export function activeAlerts(alerts: Alert[] | null | undefined) {
  const now = clock.nowMs()
  return (alerts ?? []).filter((a) => !a.ends || Date.parse(a.ends) > now)
}

export function stamp(data: Forecast | null, saved: boolean) {
  if (!data) return 'No forecast loaded yet'
  const issued = data.issued ? ` · NWS forecast issued ${fmtIssued(data.issued)}` : ''
  return `${saved ? 'Saved copy from' : 'Updated'} ${fmtStamp(data.fetchedAt)}${issued}`
}

export const previewLine = (days: readonly string[]) =>
  `Preview mode: showing ${days.map(shortDate).join(', ')} instead of the wedding days. Remove “?days=…” from the address to switch back.`

export { fmtStamp }
