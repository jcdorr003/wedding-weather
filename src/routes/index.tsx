import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ClientOnly, createFileRoute, useHydrated } from '@tanstack/react-router'
import { Suspense, use, useState } from 'react'
import * as z from 'zod/mini'
import { Shell, WeatherPage } from '../components/WeatherPage'
import { CACHE_KEY, parseDays } from '../lib/config'
import { temporalReady } from '../lib/time'
import { MockBanner } from '../mocks/MockBanner'
import { savedKeyFor, scenarioFrom } from '../mocks/scenarios'

const MOCK = import.meta.env.MODE === 'mock'

// Mock builds swap the network for made-up scenarios first (in the browser only); real builds drop this entirely.
const scenario =
  MOCK && !import.meta.env.SSR ? scenarioFrom(new URLSearchParams(location.search).get('scenario')) : null
const ready: Promise<unknown> = scenario
  ? temporalReady.then(() => import('../mocks/browser')).then((m) => m.startMocks(scenario))
  : temporalReady

// Prerendered HTML is the static frame (plus the mock banner in mock builds); the forecast is fetched in the browser.
const Home = () => (
  <>
    <ClientOnly fallback={<Shell />}>
      <Suspense fallback={<Shell />}>
        <Client />
      </Suspense>
    </ClientOnly>
    {MOCK && <MockBar />}
  </>
)

// Matches the prerendered banner (no scenario) while hydrating, then names the scenario.
const MockBar = () => <MockBanner scenario={useHydrated() ? scenario : null} />

const Client = () => {
  use(ready)
  const [client] = useState(() => new QueryClient())
  const { days, preview } = parseDays(Route.useSearch().days)
  return (
    <QueryClientProvider client={client}>
      <WeatherPage
        days={days}
        preview={preview}
        savedKey={scenario ? `${CACHE_KEY}:${savedKeyFor(scenario)}` : CACHE_KEY}
      />
    </QueryClientProvider>
  )
}

export const Route = createFileRoute('/')({
  // ?days=… previews other dates; ?scenario=… picks a mock scenario (mock builds only).
  validateSearch: z.object({ days: z.optional(z.string()), scenario: z.optional(z.string()) }),
  component: Home,
})
