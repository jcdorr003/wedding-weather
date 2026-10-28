import { expect, test } from '@playwright/test'
import { SCENARIOS } from '../../src/mocks/scenarios'
import { settle } from './extract'

// What each day card is showing: S = skeleton, F = full forecast, M = model read, P = pending/passed/no data.
const cardKinds = () =>
  [...document.querySelectorAll('.day')]
    .map((d) =>
      d.classList.contains('skeleton')
        ? 'S'
        : d.querySelector('.early-tag')
          ? 'M'
          : d.querySelector('.temp')
            ? 'F'
            : 'P',
    )
    .join('')

// Reloading a scenario starts from its saved copy, so the real cards should appear once and then stay put:
// no swapping kinds, nothing moving.
for (const scenario of Object.keys(SCENARIOS)) {
  for (const width of [375, 1440]) {
    test(`${scenario} @ ${width}px reloads without the cards changing`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.goto(`./?scenario=${scenario}`)
      await settle(page)

      await page.addInitScript(() => {
        const w = window as unknown as { cls: number }
        w.cls = 0
        new PerformanceObserver((list) => {
          for (const e of list.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[])
            if (!e.hadRecentInput) w.cls += e.value
        }).observe({ type: 'layout-shift', buffered: true })
      })
      const seen = new Set<string>()
      const reloading = page.reload()
      const sampling = (async () => {
        for (let i = 0; i < 80; i++) {
          const kinds = await page.evaluate(cardKinds).catch(() => '')
          if (kinds && !kinds.includes('S')) seen.add(kinds)
          await page.waitForTimeout(50)
        }
      })()
      await reloading
      await settle(page)
      await sampling

      // At most one set of real cards ("NWS down" with nothing saved keeps its frozen placeholders: none).
      expect(seen.size).toBeLessThanOrEqual(1)
      // "NWS down": the error notice slides in above the cards once the retries give up, on purpose.
      const budget = scenario === 'down' ? 0.1 : 0.05
      expect(await page.evaluate(() => (window as unknown as { cls: number }).cls)).toBeLessThan(budget)
    })
  }
}
