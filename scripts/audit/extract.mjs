// Read what a page shows into the JSON shape compare.py expects. Works on the live vanilla page and the React build.
// Usage: node dev/audit/extract.mjs <url> > got.json   (append ?days=YYYY-MM-DD,… to preview other dates)
import { chromium } from '@playwright/test'

const url = process.argv[2]
const browser = await chromium.launch()
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

const got = await page.evaluate(() => {
  const text = (el) => el?.innerText.replace(/\s+/g, ' ').trim() ?? null
  const days = [...document.querySelectorAll('.day')].map((d) => ({
    hi: text(d.querySelector('.hi')),
    lo: text(d.querySelector('.lo')),
    sky: text(d.querySelector('.cond')),
    stats: [...d.querySelectorAll('.stats dd')].map(text),
    runs: [...d.querySelectorAll('.run-n')].map(text),
    pending: text(d.querySelector('.pending-h')),
  }))
  const hours = [...document.querySelectorAll('.tl')].map((t) =>
    [...t.querySelectorAll('.col')].map((c) => {
      const m = /: (\d+)% chance/.exec(c.getAttribute('aria-label') ?? '')
      return m ? Number(m[1]) : null
    }),
  )
  return {
    days,
    hours,
    footer: text(document.querySelector('#footer')),
    notice: document.querySelector('#notice').hidden ? '' : text(document.querySelector('#notice')),
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }
})
console.log(JSON.stringify({ ...got, errors }))
await browser.close()
