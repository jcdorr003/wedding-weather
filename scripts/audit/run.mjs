// Audit a page against the raw NWS and Open-Meteo data: the wedding days, plus the next three days (always inside the
// NWS range, so full cards, hourly bars and rain amounts get checked too).
// Usage: pnpm verify:live [url]   (default: the live site; e.g. http://localhost:4173/wedding-weather/ for a local build)
import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Temporal } from 'temporal-polyfill'
import { extract } from './extract.mjs'

const url = process.argv[2] ?? 'https://jcdorr003.github.io/wedding-weather/'
const here = import.meta.dirname
const work = mkdtempSync(join(tmpdir(), 'wedding-audit-'))

const today = Temporal.Now.plainDateISO('America/New_York')
const sets = [
  { label: 'Wedding days', days: ['2026-11-05', '2026-11-06', '2026-11-07'], url },
  { label: 'Next three days', days: [1, 2, 3].map((n) => today.add({ days: n }).toString()) },
]
sets[1].url = `${url}?days=${sets[1].days.join(',')}`

let failed = false
for (const { label, days, url: target } of sets) {
  const dayList = days.join(',')
  const expected = join(work, `expected-${dayList}.json`)
  const shown = join(work, `page-${dayList}.json`)
  writeFileSync(expected, execFileSync('python3', [join(here, 'expected.py'), dayList]))
  writeFileSync(shown, JSON.stringify(await extract(target)))
  console.log(`${label} (${dayList}) — ${target}`)
  try {
    console.log(execFileSync('python3', [join(here, 'compare.py'), expected, shown, dayList], { encoding: 'utf8' }))
  } catch (e) {
    console.log(e.stdout)
    failed = true
  }
}
process.exitCode = failed ? 1 : 0
