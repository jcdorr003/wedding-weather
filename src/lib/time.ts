import { TZ } from './config'

// The one place the app reads the time. Mock scenarios shift it; tests use vi.setSystemTime.
let offsetMs = 0
export const clock = {
  nowMs: () => Date.now() + offsetMs,
  now: () => Temporal.Instant.fromEpochMilliseconds(clock.nowMs()),
  pretend(iso: string) {
    offsetMs = Date.parse(iso) - Date.now()
  },
}

// Prerendering on Node 24 needs it too (for day names in the loading skeleton); this branch never ships to browsers.
if (import.meta.env.SSR && !('Temporal' in globalThis)) await import('temporal-polyfill/global')

// Safari (including iOS) has no native Temporal yet; load the polyfill only where it's missing.
export const temporalReady: Promise<void> =
  'Temporal' in globalThis ? Promise.resolve() : import('temporal-polyfill/global').then(() => undefined)

export const HOUR = 3600e3

const nyZoned = (ms: number) => Temporal.Instant.fromEpochMilliseconds(ms).toZonedDateTimeISO(TZ)

export const todayNY = () => nyZoned(clock.nowMs()).toPlainDate().toString()
export const nowHourNY = () => nyZoned(clock.nowMs()).hour
export const nyAt = (ms: number) => {
  const z = nyZoned(ms)
  return { date: z.toPlainDate().toString(), hour: z.hour }
}

export const addDays = (s: string, n: number) => Temporal.PlainDate.from(s).add({ days: n }).toString()
export const fmtDate = (s: string, opts: Intl.DateTimeFormatOptions) =>
  Temporal.PlainDate.from(s).toLocaleString('en-US', opts)
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
export const fmtIssued = (iso: string) => {
  const z = zonedFromIso(iso)
  return z.toPlainDate().toString() === todayNY()
    ? z.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit' })
    : z.toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' })
}

export const hourLabel = (h: number) => `${h % 12 || 12} ${h < 12 ? 'AM' : 'PM'}`
export const shortHour = (ms: number) => {
  const h = nyAt(ms).hour
  return `${h % 12 || 12}${h < 12 ? 'a' : 'p'}`
}

// NWS grid durations look like "PT6H" or "P1DT2H".
export const durHours = (d: string | undefined) => {
  try {
    return Temporal.Duration.from(d ?? '').total({ unit: 'hours' })
  } catch {
    return 0
  }
}
