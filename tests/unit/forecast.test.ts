import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { WEDDING_DAYS, WEDDING_TITLE } from '../../src/lib/config'
import { dayCard, hoursFor, partsOfDay, title, verdict } from '../../src/lib/forecast'
import { type Forecast, loadAlerts, loadDetails, loadFromNWS, loadModels } from '../../src/lib/nws'
import { SCENARIOS, type Scenario, handlersFor } from '../../src/mocks/scenarios'

const server = setupServer()
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
afterEach(() => {
  server.resetHandlers()
  vi.useRealTimers()
})
afterAll(() => server.close())

// Load a scenario the way the page does: official forecast first, then the extras.
async function load(scenario: Scenario): Promise<Forecast> {
  const s = SCENARIOS[scenario]
  if ('now' in s) vi.setSystemTime(new Date(s.now))
  server.use(...handlersFor(scenario, { latency: 0 }))
  const core = await loadFromNWS(WEDDING_DAYS)
  const uncovered = WEDDING_DAYS.filter((k) => !core.daily.some((p) => p.date === k))
  return {
    ...core,
    models: uncovered.length ? await loadModels(uncovered) : null,
    details: core.gridUrl ? await loadDetails(core.gridUrl, WEDDING_DAYS) : null,
    alerts: await loadAlerts(),
  }
}

describe('header', () => {
  it('keeps the prerendered title in step with the wedding days', () => {
    expect(title(WEDDING_DAYS)).toBe(WEDDING_TITLE)
  })
})

describe('wedding week (Wed Nov 4, 6 PM)', () => {
  it('shows Thursday in full, with NWS rain amounts per 6-hour block', async () => {
    const data = await load('wedding')
    const thu = dayCard('2026-11-05', data)
    expect(thu.kind).toBe('full')
    if (thu.kind !== 'full') return
    expect([thu.hi, thu.lo, thu.rain, thu.rainNight]).toEqual(['58°', 'Low 49°', '70%', 'Night 60%'])
    expect(thu.thunder).toBe('Chance of thunder up to 20%.')
    expect(thu.parts?.blocks.map((b) => b.amount)).toEqual([0, 3.8, 6.4, 2.5])
    expect(thu.parts?.total).toBe('0.50 in')
  })

  it('adds gusts only when clearly above the steady wind', async () => {
    const data = await load('wedding')
    const fri = dayCard('2026-11-06', data)
    const sat = dayCard('2026-11-07', data)
    expect(fri.kind === 'full' && fri.windSub).toBe('from NW · gusts to 28 mph')
    expect(sat.kind === 'full' && sat.windSub).toBe('from W')
  })

  it('says when Friday dries out', async () => {
    const data = await load('wedding')
    expect(verdict(hoursFor('2026-11-06', data))?.head).toBe('Dry from 12 PM') // 11 AM is still 21%
  })
})

describe('halfway (Sat Oct 31)', () => {
  it('shows chances without amounts until NWS publishes them, and a model read for Saturday', async () => {
    const data = await load('halfway')
    const parts = partsOfDay('2026-11-05', data)
    expect(parts?.blocks.every((b) => b.amount == null)).toBe(true)
    expect(parts?.note).toBe('NWS rain amounts come out about 3 days ahead, around Monday, Nov 2.')
    const sat = dayCard('2026-11-07', data)
    expect(sat.kind === 'early' && sat.read.runs.map((r) => `${r.wet} of ${r.total}`)).toEqual(['6 of 31', '12 of 51'])
  })
})

describe('the wedding day itself', () => {
  it('at 2:30 AM, uses Saturday night’s low, not the Overnight period', async () => {
    const data = await load('overnight')
    const sat = dayCard('2026-11-07', data)
    expect(sat.kind === 'full' && sat.lo).toBe('Low 47°')
  })

  it('at 9:30 AM, marks earlier hours passed and says the rest of the day is dry', async () => {
    const data = await load('saturday')
    expect(verdict(hoursFor('2026-11-07', data))?.head).toBe('Dry the rest of the day')
    expect(partsOfDay('2026-11-07', data)?.blocks.map((b) => b.past)).toEqual([true, false, false, false])
    expect(data.alerts?.map((a) => a.event)).toEqual(['Wind Advisory'])
  })
})

describe('NWS down', () => {
  it('fails with a server error the page can explain', async () => {
    server.use(...handlersFor('down', { latency: 0 }))
    vi.useFakeTimers({ shouldAdvanceTime: true })
    await expect(loadFromNWS(WEDDING_DAYS)).rejects.toMatchObject({ kind: 'http', status: 503 })
  })
})
