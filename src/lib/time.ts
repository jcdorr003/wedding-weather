// Dates and times. All local-time math is America/New_York via Temporal; functions take `now` (epoch ms) explicitly
// so they stay pure and the React Compiler can't cache a stale time.
import { TZ } from './config'

// Safari (including iOS) has no native Temporal yet; load the polyfill only where it's missing.
export const temporalReady: Promise<void> =
  'Temporal' in globalThis ? Promise.resolve() : import('temporal-polyfill/global').then(() => undefined)

// Prerendering on Node 24 needs it too (for day names in the loading skeleton); this branch never ships to browsers.
if (import.meta.env.SSR) await temporalReady

/** The one place the app reads the time. Mock scenarios shift it; tests use vi.setSystemTime. */
let offsetMs = 0
export const clock = {
  nowMs: () => Date.now() + offsetMs,
  now: () => Temporal.Instant.fromEpochMilliseconds(clock.nowMs()),
  pretend(iso: string) {
    offsetMs = Date.parse(iso) - Date.now()
  },
}

export const MINUTE = 60e3
export const HOUR = 3600e3

const nyZoned = (ms: number) => Temporal.Instant.fromEpochMilliseconds(ms).toZonedDateTimeISO(TZ)

export const todayNY = (now: number) => nyZoned(now).toPlainDate().toString()
export const nowHourNY = (now: number) => nyZoned(now).hour
export const nyAt = (ms: number) => {
  const z = nyZoned(ms)
  return { date: z.toPlainDate().toString(), hour: z.hour }
}

export const addDays = (s: string, n: number) => Temporal.PlainDate.from(s).add({ days: n }).toString()
/**
 * Formats a calendar date ("2026-11-05"). Plain Intl rather than Temporal on purpose: day names appear in the loading
 * skeleton, which renders before Safari's Temporal polyfill has loaded.
 */
export const fmtDate = (s: string, opts: Intl.DateTimeFormatOptions) => {
  const [y = 0, m = 1, d = 1] = s.split('-').map(Number)
  return new Intl.DateTimeFormat('en-US', { ...opts, timeZone: 'UTC' }).format(Date.UTC(y, m - 1, d, 12))
}
export const weekday = (s: string) => fmtDate(s, { weekday: 'long' })
export const shortDate = (s: string) => fmtDate(s, { month: 'short', day: 'numeric' })
export const longDate = (s: string) => fmtDate(s, { weekday: 'long', month: 'short', day: 'numeric' })

const zonedFromIso = (iso: string) => Temporal.Instant.from(iso).toZonedDateTimeISO(TZ)
export const fmtStamp = (iso: string) =>
  zonedFromIso(iso).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  })
/** "6:00 AM" if issued today, otherwise "Tue 6:00 AM". */
export const fmtIssued = (iso: string, now: number) => {
  const z = zonedFromIso(iso)
  return z.toPlainDate().toString() === todayNY(now)
    ? z.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit' })
    : z.toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' })
}

export const hourLabel = (h: number) => `${h % 12 || 12} ${h < 12 ? 'AM' : 'PM'}`
export const shortHour = (ms: number) => {
  const h = nyAt(ms).hour
  return `${h % 12 || 12}${h < 12 ? 'a' : 'p'}`
}

/** NWS grid durations look like "PT6H" or "P1DT2H". */
export const durHours = (d: string | undefined) => {
  try {
    return Temporal.Duration.from(d ?? '').total({ unit: 'hours' })
  } catch {
    return 0
  }
}
