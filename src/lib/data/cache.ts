// The last good forecast, saved on this device and shown straight away next time (and if NWS is down).
import * as z from 'zod/mini'
import type { Forecast } from '../types'

const str = z.string()
const num = z.number()
const nstr = z.nullable(str)
const Daily = z.object({
  date: str,
  hour: num,
  isDaytime: z.boolean(),
  temp: num,
  pop: num,
  wind: str,
  dir: str,
  sky: str,
  detail: str,
})
const Hourly = z.object({ t: num, date: str, hour: num, temp: num, pop: num, wind: str, dir: str, sky: str })
const Models = z.object({ days: z.record(str, z.array(z.object({ name: str, wet: num, total: num }))) })
const Details = z.object({
  qpf: z.array(z.object({ t0: num, hours: num, mm: num })),
  gustKmh: z.record(str, num),
  thunder: z.record(str, num),
})
const Alert = z.object({ event: str, headline: str, severity: str, ends: nstr })

/**
 * The whole saved shape, checked before anything renders it. A copy saved by an older version of the page (say,
 * one without `links`) is dropped rather than crashing the page on every open; the live forecast replaces it.
 */
const SavedSchema = z.looseObject({
  fetchedAt: str,
  grid: z.object({ office: str, x: num, y: num }),
  issued: nstr,
  dailyEnd: str,
  hourlyEnd: str,
  gridUrl: nstr,
  links: z.object({ radar: nstr, zone: nstr, county: nstr }),
  daily: z.array(Daily),
  hourly: z.array(Hourly),
  models: z.nullish(Models),
  details: z.nullish(Details),
  alerts: z.nullish(z.array(Alert)),
})

export const readSaved = (key: string): Forecast | null => {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) ?? 'null')
    return SavedSchema.safeParse(value).success ? (value as Forecast) : null
  } catch {
    return null
  }
}

export const writeSaved = (key: string, forecast: Forecast) => {
  try {
    localStorage.setItem(key, JSON.stringify(forecast))
  } catch {
    // Private mode or storage full: the page works without it.
  }
}
