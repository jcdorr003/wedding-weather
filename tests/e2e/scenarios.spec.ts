import { expect, test } from '@playwright/test'
import { SCENARIOS } from '../../src/mocks/scenarios'
import { extract, settle } from './extract'

// Every number and label the page shows in each mock scenario, at phone and desktop widths, compared with the
// approved snapshot in __snapshots__/. After an intended change, review the diff and run with --update-snapshots.
for (const scenario of Object.keys(SCENARIOS)) {
  for (const width of [375, 1440]) {
    test(`${scenario} @ ${width}px`, async ({ page }) => {
      const errors: string[] = []
      page.on('pageerror', (e) => errors.push(String(e)))
      await page.setViewportSize({ width, height: 900 })
      await page.goto(`./?scenario=${scenario}`)
      await settle(page)
      expect(errors).toEqual([])
      expect(`${JSON.stringify(await extract(page), null, 2)}\n`).toMatchSnapshot(`${scenario}-${width}.json`)
    })
  }
}
