import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ClientOnly, createFileRoute } from '@tanstack/react-router'
import { Suspense, use, useState } from 'react'
import * as z from 'zod/mini'
import { Shell, WeatherPage } from '../components/WeatherPage'
import { parseDays } from '../lib/config'
import { temporalReady } from '../lib/time'

// Prerendered HTML is the static frame; the forecast itself is fetched and rendered in the browser.
const Home = () => (
  <ClientOnly fallback={<Shell />}>
    <Suspense fallback={<Shell />}>
      <Client />
    </Suspense>
  </ClientOnly>
)

// Mock builds swap the network for made-up scenarios first (in the browser only); real builds drop this entirely.
const mocks =
  import.meta.env.MODE === 'mock' && !import.meta.env.SSR
    ? temporalReady.then(() => import('../mocks/browser')).then((m) => m.startMocks())
    : null
const ready: Promise<unknown> = mocks ?? temporalReady
type Mocks = NonNullable<typeof mocks>

const Client = () => {
  use(ready)
  const [client] = useState(() => new QueryClient())
  const { days, preview } = parseDays(Route.useSearch().days)
  return (
    <QueryClientProvider client={client}>
      {mocks && <MockBar pending={mocks} />}
      <WeatherPage days={days} preview={preview} />
    </QueryClientProvider>
  )
}

const MockBar = ({ pending }: { pending: Mocks }) => {
  const { MockBanner } = use(pending)
  return <MockBanner />
}

export const Route = createFileRoute('/')({
  // ?days=… previews other dates; ?scenario=… picks a mock scenario (mock builds only).
  validateSearch: z.object({ days: z.optional(z.string()), scenario: z.optional(z.string()) }),
  component: Home,
})
