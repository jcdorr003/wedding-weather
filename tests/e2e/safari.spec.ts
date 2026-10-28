import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import { SCENARIOS } from '../../src/mocks/scenarios'
import { extract, settle } from './extract'

// Safari (including iOS) has no native Temporal yet, so the page loads a polyfill first. On a cold start from the
// Home Screen that polyfill can arrive after the page hydrates, and anything that touches Temporal before then shows
// "Something went wrong!". Chromium has Temporal, so remove it and hold the polyfill back to load the page the way a
// slow iPhone does.
const POLYFILL = '**/assets/global.esm-*.js'

for (const scenario of Object.keys(SCENARIOS)) {
  for (const width of [375, 440]) {
    test(`${scenario} @ ${width}px works when Safari's Temporal polyfill arrives late`, async ({ page }) => {
      const errors: string[] = []
      page.on('pageerror', (e) => errors.push(String(e)))
      await page.addInitScript(() => {
        Reflect.deleteProperty(globalThis, 'Temporal')
      })
      let delayed = false
      await page.route(POLYFILL, async (route) => {
        delayed = true
        await new Promise((r) => setTimeout(r, 2000))
        await route.continue()
      })
      await page.setViewportSize({ width, height: 900 })
      await page.goto(`./?scenario=${scenario}`)
      await settle(page)

      // If the polyfill chunk is renamed, fail here rather than quietly testing nothing.
      expect(delayed).toBe(true)
      expect(errors).toEqual([])
      // Same page as with native Temporal (columns are checked by the scenario snapshots).
      const { columns: _, ...shown } = await extract(page)
      const { columns: __, ...approved } = JSON.parse(
        readFileSync(`tests/e2e/__snapshots__/${scenario}-375.json`, 'utf8'),
      ) as Record<string, unknown>
      expect(shown).toEqual(approved)
    })
  }
}
