import { expect, test } from '@playwright/test'
import { settle } from './extract'

// A phone can hold a saved copy written by an older version of the page. One without `links` crashed every open
// ("s?.links.radar") until the saved copy was validated in full; it must be ignored and replaced instead.
for (const width of [375, 440]) {
  test(`an old saved copy is replaced, not shown @ ${width}px`, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(String(e)))
    await page.setViewportSize({ width, height: 900 })
    await page.goto('./?scenario=wedding')
    await settle(page)
    await page.evaluate(() => {
      for (const key of Object.keys(localStorage).filter((k) => k.startsWith('wedding-weather:'))) {
        const { links: _, ...old } = JSON.parse(localStorage.getItem(key) ?? '{}') as Record<string, unknown>
        localStorage.setItem(key, JSON.stringify(old))
      }
    })
    await page.reload()
    await settle(page)
    expect(errors).toEqual([])
    await expect(page.locator('#radar-link')).toHaveAttribute('href', /radar\.weather\.gov/)
  })
}
