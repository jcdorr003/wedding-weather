// The mock scenarios end to end through the loaders and the page logic.
import { describe, expect, it } from 'vitest'
import { WEDDING_DAYS } from '../../src/lib/config'
import { dayCard, partsOfDay } from '../../src/lib/forecast/day'
import { hoursFor, verdict } from '../../src/lib/forecast/timeline'
import { loadForecast, loadPoints } from '../../src/lib/api/nws'
import { enterScenario, loadScenario, setupMockServer } from './msw'

setupMockServer()

describe('wedding week (Wed Nov 4, 6 PM)', () => {
  it('shows Thursday in full, with NWS rain amounts per 6-hour block', async () => {
    const { data, now } = await loadScenario('wedding')
    const thu = dayCard('2026-11-05', data, now)
    expect(thu.kind).toBe('full')
    if (thu.kind !== 'full') return
    expect([thu.hi, thu.lo, thu.rain, thu.rainNight]).toEqual(['58°', 'Low 49°', '70%', 'Night 60%'])
    expect(thu.thunder).toBe('Chance of thunder up to 20%.')
    expect(thu.parts?.blocks.map((b) => b.amount)).toEqual([0, 3.8, 6.4, 2.5])
    expect(thu.parts?.total).toBe('0.50 in')
  })

  it('adds gusts only when clearly above the steady wind', async () => {
    const { data, now } = await loadScenario('wedding')
    const fri = dayCard('2026-11-06', data, now)
    const sat = dayCard('2026-11-07', data, now)
    expect(fri.kind === 'full' && fri.windSub).toBe('from NW · gusts to 28 mph')
    expect(sat.kind === 'full' && sat.windSub).toBe('from W')
  })

  it('says when Friday dries out', async () => {
    const { data } = await loadScenario('wedding')
    expect(verdict(hoursFor('2026-11-06', data))?.head).toBe('Dry from 12 PM') // 11 AM is still 21%
  })
})

describe('today (Tue Oct 27)', () => {
  it('shows an early model read for every wedding day', async () => {
    const { data, now } = await loadScenario('today')
    expect(WEDDING_DAYS.map((d) => dayCard(d, data, now).kind)).toEqual(['early', 'early', 'early'])
  })
})

describe('halfway (Sat Oct 31)', () => {
  it('shows chances without amounts until NWS publishes them, and a model read for Saturday', async () => {
    const { data, now } = await loadScenario('halfway')
    const parts = partsOfDay('2026-11-05', data, now)
    expect(parts?.blocks.every((b) => b.amount == null)).toBe(true)
    expect(parts?.note).toBe('NWS rain amounts come out about 3 days ahead, around Monday, Nov 2.')
    const sat = dayCard('2026-11-07', data, now)
    expect(sat.kind === 'early' && sat.read.runs.map((r) => `${r.wet} of ${r.total}`)).toEqual(['6 of 31', '12 of 51'])
  })
})

describe('the wedding day itself', () => {
  it('at 2:30 AM, uses Saturday night’s low, not the Overnight period', async () => {
    const { data, now } = await loadScenario('overnight')
    const sat = dayCard('2026-11-07', data, now)
    expect(sat.kind === 'full' && sat.lo).toBe('Low 47°')
  })

  it('at 9:30 AM, marks earlier hours passed and says the rest of the day is dry', async () => {
    const { data, now } = await loadScenario('saturday')
    expect(verdict(hoursFor('2026-11-07', data))?.head).toBe('Dry the rest of the day')
    expect(partsOfDay('2026-11-07', data, now)?.blocks.map((b) => b.past)).toEqual([true, false, false, false])
    expect(data.alerts?.map((a) => a.event)).toEqual(['Wind Advisory'])
  })
})

describe('NWS down', () => {
  it('fails with a server error the page can explain', async () => {
    enterScenario('down')
    await expect(loadPoints()).rejects.toMatchObject({ kind: 'http', status: 503 })
  })

  it('needs no /points call once the grid is known', async () => {
    enterScenario('wedding')
    const points = await loadPoints()
    enterScenario('down')
    await expect(loadForecast(points, WEDDING_DAYS)).rejects.toMatchObject({ status: 503 })
  })
})
