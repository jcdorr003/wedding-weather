import { pathToFileURL } from 'node:url'
import { type Page, expect, test } from '@playwright/test'
import { SCENARIOS } from '../../src/mocks/scenario-list'
import { settle } from './extract'

// Cumulative Layout Shift from first paint until the forecast (and its extras) has fully loaded.
// "Good" CLS is under 0.1 (web.dev/articles/cls); the loading skeletons keep it near zero. A real NWS alert
// sliding in (Saturday) is the one deliberate shift. "NWS down" collapses to short error cards, so it's exempt.
async function cls(page: Page, url: string) {
  await page.addInitScript(() => {
    ;(window as unknown as { __cls: number }).__cls = 0
    new PerformanceObserver((list) => {
      for (const e of list.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[])
        if (!e.hadRecentInput) (window as unknown as { __cls: number }).__cls += e.value
    }).observe({ type: 'layout-shift', buffered: true })
  })
  await page.goto(url)
  await settle(page)
  return page.evaluate(() => (window as unknown as { __cls: number }).__cls)
}

const legacy = pathToFileURL('dev/wedding-weather-mock.html').href

for (const scenario of Object.keys(SCENARIOS)) {
  for (const width of [375, 1440]) {
    test(`${scenario} @ ${width}px barely shifts while loading`, async ({ browser }) => {
      const page = await browser.newPage({ viewport: { width, height: 900 } })
      const value = await cls(page, `./?scenario=${scenario}`)
      const before = await cls(
        await browser.newPage({ viewport: { width, height: 900 } }),
        `${legacy}?scenario=${scenario}`,
      )
      test
        .info()
        .annotations.push({ type: 'CLS', description: `react ${value.toFixed(3)} · vanilla ${before.toFixed(3)}` })
      console.log(`${scenario} @ ${width}: react ${value.toFixed(3)}  vanilla ${before.toFixed(3)}`)
      if (scenario !== 'down') expect(value).toBeLessThan(0.1)
    })
  }
}
