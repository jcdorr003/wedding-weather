import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { CACHE_KEY, WEDDING_DAYS } from '../../src/lib/config'
import { useForecast } from '../../src/lib/data/useForecast'
import { enterScenario, loadScenario, server, setupMockServer } from './msw'

setupMockServer()

const render = (now: number) => {
  const client = new QueryClient()
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return renderHook(() => useForecast({ days: WEDDING_DAYS, preview: false, now, savedKey: CACHE_KEY }), { wrapper })
}

describe('useForecast', () => {
  it('loads the forecast and its extras, then saves the full picture on the device', async () => {
    const now = enterScenario('wedding')
    const { result } = render(now)
    await waitFor(() => expect(result.current.busy).toBe(false))
    expect(result.current).toMatchObject({ saved: false, error: null })
    expect(result.current.data?.details?.qpf.length).toBeGreaterThan(0)
    expect(result.current.data?.alerts).toEqual([])
    expect(JSON.parse(localStorage.getItem(CACHE_KEY) ?? '{}').details).toEqual(result.current.data?.details)
  })

  it('shows the saved copy straight away and keeps it, flagged as saved, when NWS is down', async () => {
    const { data } = await loadScenario('wedding')
    localStorage.setItem(CACHE_KEY, JSON.stringify(data))
    const now = enterScenario('down')
    const { result } = render(now)
    expect(result.current.data?.fetchedAt).toBe(data.fetchedAt)
    expect(result.current.saved).toBe(true)
    await waitFor(() => expect(result.current.error).not.toBeNull(), { timeout: 5000 }) // after the retry backoff
    expect(result.current.data?.details).toEqual(data.details)
    expect(result.current.saved).toBe(true)
  })

  it('ignores a saved copy in an older shape and replaces it with the live forecast', async () => {
    const { data } = await loadScenario('wedding')
    const { links: _, ...old } = data
    localStorage.setItem(CACHE_KEY, JSON.stringify(old))
    const now = enterScenario('wedding')
    const { result } = render(now)
    expect(result.current.data).toBeNull()
    await waitFor(() => expect(result.current.data?.links).toBeDefined())
    await waitFor(() => expect(JSON.parse(localStorage.getItem(CACHE_KEY) ?? '{}').links).toBeDefined())
  })

  it('drops an extra that fails instead of showing a stale one', async () => {
    const now = enterScenario('wedding')
    server.use(http.get('https://api.weather.gov/mock/grid', () => new HttpResponse(null, { status: 500 })))
    const { result } = render(now)
    await waitFor(() => expect(result.current.busy).toBe(false), { timeout: 5000 })
    expect(result.current.data?.daily.length).toBeGreaterThan(0)
    expect(result.current.data?.details).toBeNull()
  })
})
