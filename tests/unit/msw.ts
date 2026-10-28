// Shared test setup: MSW in Node with the mock scenarios, and a loader that mirrors the page's order of requests.
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, vi } from 'vitest'
import { loadAlerts, loadDetails, loadForecast, loadPoints } from '../../src/lib/api/nws'
import { loadModels } from '../../src/lib/api/openMeteo'
import { WEDDING_DAYS } from '../../src/lib/config'
import { todayNY } from '../../src/lib/time'
import type { Forecast } from '../../src/lib/types'
import { handlersFor } from '../../src/mocks/handlers'
import { SCENARIOS, type Scenario } from '../../src/mocks/scenarios'

export const server = setupServer()

export const setupMockServer = () => {
  beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
  afterEach(() => {
    server.resetHandlers()
    vi.useRealTimers()
    localStorage.clear()
  })
  afterAll(() => server.close())
}

/** Pretend it's the scenario's time and serve its responses instantly. Returns that time (epoch ms). */
export const enterScenario = (scenario: Scenario) => {
  const now = Date.parse(SCENARIOS[scenario].now)
  vi.useFakeTimers({ now, shouldAdvanceTime: true })
  server.resetHandlers(...handlersFor(scenario, { latency: 0 }))
  return now
}

/** Load a scenario the way the page does: official forecast first, then the extras. */
export const loadScenario = async (scenario: Scenario): Promise<{ data: Forecast; now: number }> => {
  const now = enterScenario(scenario)
  const core = await loadForecast(await loadPoints(), WEDDING_DAYS)
  const uncovered = WEDDING_DAYS.filter((k) => !core.daily.some((p) => p.date === k))
  const data = {
    ...core,
    models: uncovered.length ? await loadModels(uncovered, todayNY(now)) : null,
    details: core.gridUrl ? await loadDetails(core.gridUrl, WEDDING_DAYS) : null,
    alerts: await loadAlerts(),
  }
  return { data, now }
}
