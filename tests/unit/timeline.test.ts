import { describe, expect, it } from 'vitest'
import { type Hours, hoursFor, pastBefore, verdict } from '../../src/lib/forecast/timeline'
import type { Forecast, HourlyPeriod } from '../../src/lib/types'

const hour = (h: number, pop: number): HourlyPeriod => ({
  t: 0,
  date: '2026-11-07',
  hour: h,
  temp: 50,
  pop,
  wind: '5 mph',
  dir: 'W',
  sky: '',
})
/** 24 hours from a list of chances; null entries are hours without data. */
const day = (pops: (number | null)[]): Hours => pops.map((p, h) => (p == null ? null : hour(h, p)))
const flat = (pop: number) => Array.from({ length: 24 }, () => pop)

describe('verdict', () => {
  it('has nothing to say without hourly data', () => {
    expect(verdict(day(Array.from({ length: 24 }, () => null)))).toBeNull()
  })

  it('dry all day', () => {
    expect(verdict(day(flat(5)))).toEqual({
      head: 'Dry all day',
      sub: 'Rain chance stays under 20% every hour. Peak 5% at 12 AM.',
    })
  })

  it('dry the rest of the day when earlier hours have passed', () => {
    const v = verdict(day([null, null, null, ...flat(3).slice(3)]))
    expect(v?.head).toBe('Dry the rest of the day')
    expect(v?.sub).toContain('every remaining hour')
  })

  it('dry so far when the hourly forecast ends early', () => {
    const v = verdict(day([...flat(4).slice(0, 15), ...Array.from({ length: 9 }, () => null)]))
    expect(v?.head).toBe('Dry so far')
    expect(v?.sub).toContain('Hourly data currently ends at 2 PM.')
  })

  it('dries out after the last wet hour', () => {
    const pops = flat(5)
    pops[9] = 40
    pops[10] = 25
    expect(verdict(day(pops))).toMatchObject({ head: 'Dry from 11 AM', clearAt: 11 })
  })

  it('still wet at midnight', () => {
    const pops = flat(5)
    pops[23] = 30
    expect(verdict(day(pops))?.head).toBe('Still 30% at 11 PM')
  })

  it('still wet where the hourly forecast ends', () => {
    const pops: (number | null)[] = [...flat(5).slice(0, 15), ...Array.from({ length: 9 }, () => null)]
    pops[14] = 60
    expect(verdict(day(pops))?.head).toBe('Still 60% at 2 PM')
  })
})

describe('hoursFor', () => {
  it('keeps the first period for each local hour and ignores other days', () => {
    const data = { hourly: [hour(3, 10), hour(3, 99), { ...hour(4, 50), date: '2026-11-08' }] } as Forecast
    const hours = hoursFor('2026-11-07', data)
    expect(hours[3]?.pop).toBe(10)
    expect(hours.filter(Boolean)).toHaveLength(1)
  })
})

describe('pastBefore', () => {
  const at930 = Date.parse('2026-11-07T09:30:00-05:00')
  it('counts the hours already gone today, all of a past day, none of a future day', () => {
    expect(pastBefore('2026-11-07', at930)).toBe(9)
    expect(pastBefore('2026-11-06', at930)).toBe(24)
    expect(pastBefore('2026-11-08', at930)).toBe(0)
  })
})
