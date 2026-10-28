// What each hourly rain timeline shows.
import { THRESHOLD } from '../config'
import { hourLabel, nowHourNY, todayNY } from '../time'
import type { Forecast, HourlyPeriod } from '../types'
import { pct } from './format'

export type Hours = (HourlyPeriod | null)[]
export type Verdict = { head: string; sub: string; clearAt?: number }

/** The day's 24 local hours; null where NWS has no hourly forecast (passed, or not out yet). */
export const hoursFor = (key: string, data: Forecast | null): Hours => {
  const hours: Hours = Array.from({ length: 24 }, () => null)
  for (const h of data?.hourly ?? []) if (h.date === key) hours[h.hour] ??= h
  return hours
}

/** Hours before this one have already happened (NWS only forecasts from the current hour on). */
export const pastBefore = (key: string, now: number) => {
  const today = todayNY(now)
  return key < today ? 24 : key === today ? nowHourNY(now) : 0
}

/** One plain-language line about the day's rain, plus the hour it dries out (if it does). */
export const verdict = (hours: Hours): Verdict | null => {
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
