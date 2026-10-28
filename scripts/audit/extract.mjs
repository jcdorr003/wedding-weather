// Read what the page shows into the JSON shape compare.py expects.
import { chromium } from '@playwright/test'

/** Load `url` in headless Chromium, wait for the forecast and its extras, and read every checked value. */
export const extract = async (url) => {
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
    const errors = []
    page.on('pageerror', (e) => errors.push(String(e)))
    await page.goto(url)
    await page.waitForFunction(
      () => {
        const btn = document.querySelector('#refresh')
        const stamp = document.querySelector('#stamp')?.textContent ?? ''
        return btn && !btn.disabled && !stamp.startsWith('Loading')
      },
      null,
      { timeout: 60_000 },
    )
    await page.waitForTimeout(500)

    const shown = await page.evaluate(() => {
      const text = (el) => el?.innerText.replace(/\s+/g, ' ').trim() ?? null
      const stat = (d, i) => d.querySelectorAll('.stats > div')[i]
      return {
        days: [...document.querySelectorAll('.day')].map((d) => ({
          hi: text(d.querySelector('.hi')),
          lo: text(d.querySelector('.lo')),
          sky: text(d.querySelector('.cond')),
          rain: text(stat(d, 0)?.querySelector('dd:not(.sub)')),
          rainNight: text(stat(d, 0)?.querySelector('dd.sub')),
          wind: text(stat(d, 1)?.querySelector('dd:not(.sub)')),
          parts: [...d.querySelectorAll('.part-amt')].map(text),
          runs: [...d.querySelectorAll('.run-n')].map(text),
          pending: text(d.querySelector('.pending-h')),
        })),
        hours: [...document.querySelectorAll('.tl')].map((t) =>
          [...t.querySelectorAll('.col')].map((c) => {
            const m = /: (\d+)% chance/.exec(c.getAttribute('aria-label') ?? '')
            return m ? Number(m[1]) : null
          }),
        ),
        footer: text(document.querySelector('#footer')),
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      }
    })
    return { ...shown, errors }
  } finally {
    await browser.close()
  }
}
