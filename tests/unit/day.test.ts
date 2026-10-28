import { describe, expect, it } from 'vitest'
import { blockAmount, dayCard, earlyRead, partsOfDay } from '../../src/lib/forecast/day'
import { HOUR } from '../../src/lib/time'
import type { Details, Forecast } from '../../src/lib/types'

const at = (iso: string) => Date.parse(iso)
const base: Forecast = {
  fetchedAt: '2026-11-04T23:00:00Z',
  grid: { office: 'OKX', x: 35, y: 40 },
  issued: null,
  dailyEnd: '2026-11-10',
  hourlyEnd: '2026-11-10T23:00:00-05:00',
  gridUrl: null,
  links: { radar: null, zone: null, county: null },
  daily: [],
  hourly: [],
  models: null,
  details: null,
  alerts: null,
}

describe('blockAmount', () => {
  const a = at('2026-11-05T06:00:00Z')
  const qpf = (offsetHours: number, hours: number, mm: number) => ({ t0: a + offsetHours * HOUR, hours, mm })

  it('sums NWS amounts that exactly fill the block', () => {
    const details: Details = { qpf: [qpf(0, 6, 2.5)], gustKmh: {}, thunder: {} }
    expect(blockAmount(details, a, a + 6 * HOUR)).toBe(2.5)
  })

  it('refuses to estimate when an amount straddles the block or doesn’t cover it', () => {
    expect(blockAmount({ qpf: [qpf(-3, 6, 4)], gustKmh: {}, thunder: {} }, a, a + 6 * HOUR)).toBeNull()
    expect(blockAmount({ qpf: [qpf(0, 3, 1)], gustKmh: {}, thunder: {} }, a, a + 6 * HOUR)).toBeNull()
    expect(blockAmount(null, a, a + 6 * HOUR)).toBeNull()
  })
})

describe('dayCard', () => {
  const now = at('2026-11-04T18:00:00-05:00')

  it('is "nodata" before anything has loaded, and "passed" for days gone by', () => {
    expect(dayCard('2026-11-05', null, now).kind).toBe('nodata')
    expect(dayCard('2026-11-03', base, now).kind).toBe('passed')
  })

  it('is "pending" for a day beyond the forecast with no model read', () => {
    const card = dayCard('2026-11-12', base, now)
    expect(card).toEqual({
      kind: 'pending',
      dailyEnd: 'Tue, Nov 10',
      when: 'Thursday should appear around Friday, Nov 6',
    })
  })

  it('uses the evening period as the night, never the 12–6 AM "Overnight"', () => {
    const period = { date: '2026-11-07', wind: '5 mph', dir: 'W', sky: 'Clear', detail: '', pop: 0 }
    const data = {
      ...base,
      daily: [
        { ...period, hour: 2, isDaytime: false, temp: 41 },
        { ...period, hour: 6, isDaytime: true, temp: 59 },
        { ...period, hour: 18, isDaytime: false, temp: 47 },
      ],
    }
    const card = dayCard('2026-11-07', data, at('2026-11-07T02:30:00-05:00'))
    expect(card.kind === 'full' && [card.hi, card.lo]).toEqual(['59°', 'Low 47°'])
  })
})

describe('partsOfDay', () => {
  it('totals only the blocks still to come once some have passed', () => {
    const t0 = at('2026-11-07T06:00:00Z')
    const qpf = [0, 1, 2, 3].map((i) => ({ t0: t0 + i * 6 * HOUR, hours: 6, mm: 25.4 }))
    const hourly = [{ t: t0, date: '2026-11-07', hour: 1, temp: 45, pop: 10, wind: '', dir: '', sky: '' }]
    const parts = partsOfDay(
      '2026-11-07',
      { ...base, hourly, details: { qpf, gustKmh: {}, thunder: {} } },
      at('2026-11-07T09:30:00-05:00'),
    )
    expect(parts?.blocks.map((b) => b.past)).toEqual([true, false, false, false])
    expect([parts?.total, parts?.totalFromNow]).toEqual(['3.00 in', true])
  })
})

const runs = (gfs: number, ecmwf: number) => [
  { name: 'US model (GFS)', wet: gfs, total: 31 },
  { name: 'European model (ECMWF)', wet: ecmwf, total: 51 },
]

describe('earlyRead', () => {
  const now = at('2026-10-27T12:00:00-04:00')

  it('weighs each model equally and words the odds in tenths', () => {
    expect(earlyRead('2026-11-07', runs(3, 5), now)).toMatchObject({
      head: 'Leaning dry',
      sub: expect.stringMatching(/^About 1 in 10/),
    })
    expect(earlyRead('2026-11-07', runs(15, 26), now).head).toBe('Could go either way')
    expect(earlyRead('2026-11-07', runs(31, 51), now)).toMatchObject({
      head: 'Leaning wet',
      sub: expect.stringMatching(/^Nearly all/),
    })
  })
})
