// Open-Meteo ensemble API: the share of GFS and ECMWF runs that are wet each day, for days the NWS forecast doesn't
// reach yet. Day-level odds only (see the accuracy rules in CLAUDE.md).
import { ENSEMBLES, POINT, TZ, WET_INCHES } from '../config'
import type { Models, Run } from '../types'
import { getJSON, parse } from './http'
import { EnsembleSchema } from './schemas'

export const loadModels = async (
  keys: readonly string[],
  today: string,
  signal?: AbortSignal,
): Promise<Models | null> => {
  const first = keys[0]
  const end = keys.at(-1)
  if (!first || !end) return null
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
    signal,
  })
  const { time, ...members } = parse(EnsembleSchema, json).hourly
  const series = Object.entries(members).filter(([k]) => k.startsWith('precipitation'))

  const days: Record<string, Run[]> = {}
  for (const key of keys) {
    const idx = time.flatMap((t, i) => (t.startsWith(key) ? [i] : []))
    if (!idx.length) continue
    const runs = ENSEMBLES.map(({ name, match }) => {
      let wet = 0
      let total = 0
      for (const [k, values] of series) {
        if (!k.includes(match)) continue
        const vals = idx.map((i) => values[i]).filter((v) => v != null)
        if (vals.length < idx.length * 0.75) continue // a run with too many gaps doesn't count
        total++
        if (vals.reduce((a, b) => a + b, 0) >= WET_INCHES) wet++
      }
      return { name, wet, total }
    }).filter((r) => r.total > 0)
    if (runs.length) days[key] = runs
  }
  return { days }
}
