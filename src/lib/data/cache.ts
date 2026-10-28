// The last good forecast, saved on this device and shown straight away next time (and if NWS is down).
import * as z from 'zod/mini'
import type { Forecast } from '../types'

const SavedSchema = z.looseObject({ fetchedAt: z.string(), daily: z.array(z.unknown()), hourly: z.array(z.unknown()) })

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
