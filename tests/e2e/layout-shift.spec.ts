import { expect, test } from '@playwright/test'
import { SCENARIOS } from '../../src/mocks/scenarios'
import { settle } from './extract'

type ClsWindow = Window & { cls: number }

// Cumulative Layout Shift from first paint until the forecast (and its extras) has fully loaded. "Good" CLS is under
// 0.1 (web.dev/articles/cls). Saturday's made-up Wind Advisory slides in above the cards on purpose (an alert should
// be noticed), so it gets a little more room; "NWS down" collapses to short error cards, so it's exempt.
const BUDGET: Partial<Record<string, number>> = { saturday: 0.15 }
for (const scenario of Object.keys(SCENARIOS)) {
  for (const width of [375, 1440]) {
    test(`${scenario} @ ${width}px barely shifts while loading`, async ({ page }) => {
      test.skip(scenario === 'down', 'error state replaces the skeleton with short cards')
      await page.setViewportSize({ width, height: 900 })
      await page.addInitScript(() => {
        const w = window as unknown as ClsWindow
        w.cls = 0
        new PerformanceObserver((list) => {
          for (const e of list.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[])
            if (!e.hadRecentInput) w.cls += e.value
        }).observe({ type: 'layout-shift', buffered: true })
      })
      await page.goto(`./?scenario=${scenario}`)
      await settle(page)
      const cls = await page.evaluate(() => (window as unknown as ClsWindow).cls)
      test.info().annotations.push({ type: 'CLS', description: cls.toFixed(3) })
      expect(cls).toBeLessThan(BUDGET[scenario] ?? 0.1)
    })
  }
}
