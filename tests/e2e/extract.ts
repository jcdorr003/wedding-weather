import type { Page } from '@playwright/test'

/** Wait until the page has finished loading (official forecast and extras), as a person would see it. */
export const settle = async (page: Page) => {
  await page.waitForFunction(
    () => {
      const btn = document.querySelector<HTMLButtonElement>('#refresh')
      const stamp = document.querySelector('#stamp')?.textContent ?? ''
      return btn && !btn.disabled && !stamp.startsWith('Loading')
    },
    null,
    { timeout: 45_000 },
  )
  await page.waitForTimeout(300)
}

/** Everything the page shows, as plain data, so two implementations can be compared field by field. */
export const extract = (page: Page) => {
  return page.evaluate(() => {
    const text = (el: Element | null) => (el as HTMLElement | null)?.innerText.replace(/\s+/g, ' ').trim() ?? null
    const all = (sel: string, root: ParentNode = document) => [...root.querySelectorAll(sel)]
    const visible = (sel: string) => {
      const el = document.querySelector<HTMLElement>(sel)
      return !!el && !el.hidden
    }
    return {
      title: text(document.querySelector('h1')),
      stamp: text(document.querySelector('#stamp')),
      refresh: text(document.querySelector('#refresh')),
      alerts: visible('#alerts')
        ? all('.alert').map((a) => ({
            text: text(a),
            cls: a.className.trim().split(/\s+/).toSorted(),
            href: a.querySelector('a')?.getAttribute('href'),
          }))
        : [],
      notice: visible('#notice') ? all('#notice p').map(text) : [],
      days: all('.day').map((d) => ({
        text: text(d),
        sections: [...d.children].map((c) => c.className),
        runBars: all('.run-bar i', d).map((i) => (i as HTMLElement).style.width),
        parts: all('.part', d).map((p) => p.className.trim()),
      })),
      earlyNote: visible('#early-note'),
      timelines: all('.tl').map((t) => ({
        verdict: all('.verdict-h, .verdict-sub', t).map(text),
        cols: all('.col', t).map((c) => ({
          cls: c.className
            .trim()
            .split(/\s+/)
            .filter((x) => x !== 'active')
            .toSorted()
            .join(' '),
          label: c.getAttribute('aria-label'),
          h: (c.querySelector('i') as HTMLElement).style.height || null,
        })),
        key: text(t.querySelector('.key')),
        hours: all('.hours li', t).map(text),
      })),
      radar: document.querySelector('#radar-link')?.getAttribute('href'),
      footer: text(document.querySelector('#footer')),
      footerLink: document.querySelector('#footer a')?.getAttribute('href') ?? null,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      // How many columns the cards form (catches layout regressions such as phones losing the stacked layout).
      columns: {
        days: new Set(all('.day').map((d) => Math.round(d.getBoundingClientRect().left))).size,
        timelines: new Set(all('.tl').map((t) => Math.round(t.getBoundingClientRect().left))).size,
      },
    }
  })
}
