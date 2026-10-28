import { pathToFileURL } from 'node:url'
import { expect, test } from '@playwright/test'
import { SCENARIOS } from '../../src/mocks/scenario-list'
import { extract, settle } from './extract'

// The vanilla page's own mock (dev/build-mock.py) is the reference: same made-up data, same faked clock.
const legacy = pathToFileURL('dev/wedding-weather-mock.html').href

for (const scenario of Object.keys(SCENARIOS)) {
  for (const width of [375, 1440]) {
    test(`${scenario} @ ${width}px matches the vanilla page`, async ({ browser }) => {
      const open = async (url: string) => {
        const page = await browser.newPage({ viewport: { width, height: 900 } })
        const errors: string[] = []
        page.on('pageerror', (e) => errors.push(String(e)))
        page.on(
          'console',
          (m) => m.type() === 'error' && !m.text().includes('Failed to load resource') && errors.push(m.text()),
        )
        await page.goto(url)
        await settle(page)
        return { page, errors }
      }
      const old = await open(`${legacy}?scenario=${scenario}`)
      const neu = await open(`./?scenario=${scenario}`)
      expect(neu.errors).toEqual([])
      expect(await extract(neu.page)).toEqual(await extract(old.page))
      await old.page.screenshot({ path: `tests/e2e/out/${scenario}-${width}-legacy.png`, fullPage: true })
      await neu.page.screenshot({ path: `tests/e2e/out/${scenario}-${width}-react.png`, fullPage: true })
    })
  }
}
