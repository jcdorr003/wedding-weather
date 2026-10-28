import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ClientOnly, createFileRoute } from '@tanstack/react-router'
import { Suspense, use, useState } from 'react'
import { Shell, WeatherPage } from '../components/WeatherPage'
import { daysFromSearch } from '../lib/config'
import { temporalReady } from '../lib/time'

export const Route = createFileRoute('/')({ component: Home })

// Prerendered HTML is the static frame; the forecast itself is fetched and rendered in the browser.
function Home() {
  return (
    <ClientOnly fallback={<Shell />}>
      <Suspense fallback={<Shell />}>
        <Client />
      </Suspense>
    </ClientOnly>
  )
}

// Mock builds swap the network for made-up scenarios first; real builds drop this branch entirely.
const mocks =
  import.meta.env.MODE === 'mock'
    ? temporalReady.then(() => import('../mocks/browser')).then((m) => m.startMocks())
    : null
const ready: Promise<unknown> = mocks ?? temporalReady

function Client() {
  use(ready)
  const [client] = useState(() => new QueryClient())
  const { days, preview } = daysFromSearch(location.search)
  return (
    <QueryClientProvider client={client}>
      {import.meta.env.MODE === 'mock' && <MockBar />}
      <WeatherPage days={days} preview={preview} />
    </QueryClientProvider>
  )
}

function MockBar() {
  const { MockBanner } = use(mocks!)
  return <MockBanner />
}
