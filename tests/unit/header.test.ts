import { describe, expect, it } from 'vitest'
import { WEDDING_DAYS, WEDDING_TITLE, parseDays } from '../../src/lib/config'
import { fmtInches, windRange } from '../../src/lib/forecast/format'
import { activeAlerts, stamp, title } from '../../src/lib/forecast/header'
import { predictKinds } from '../../src/lib/skeleton'
import type { Forecast } from '../../src/lib/types'

describe('header', () => {
  it('keeps the prerendered title in step with the wedding days', () => {
    expect(title(WEDDING_DAYS)).toBe(WEDDING_TITLE)
    expect(title(['2026-10-30', '2026-10-31', '2026-11-01'])).toBe('Friday–Sunday, Oct 30 – Nov 1')
  })

  it('names the issue day only when it isn’t today', () => {
    const data = { fetchedAt: '2026-11-04T23:00:00Z', issued: '2026-11-04T22:20:00Z' } as Forecast
    expect(stamp(data, false, Date.parse('2026-11-04T18:00:00-05:00'))).toBe(
      'Updated Wed, Nov 4, 6:00 PM EST · NWS forecast issued 5:20 PM',
    )
    expect(stamp(data, true, Date.parse('2026-11-05T08:00:00-05:00'))).toBe(
      'Saved copy from Wed, Nov 4, 6:00 PM EST · NWS forecast issued Wed 5:20 PM',
    )
    expect(stamp(null, false, 0)).toBe('No forecast loaded yet')
  })

  it('hides alerts that have ended', () => {
    const alerts = [
      { event: 'Wind Advisory', headline: '', severity: 'Moderate', ends: '2026-11-07T18:00:00-05:00' },
      { event: 'Frost Advisory', headline: '', severity: 'Minor', ends: '2026-11-07T08:00:00-05:00' },
    ]
    expect(activeAlerts(alerts, Date.parse('2026-11-07T09:30:00-05:00')).map((a) => a.event)).toEqual(['Wind Advisory'])
  })
})

describe('format', () => {
  it('wind ranges and rain amounts', () => {
    expect(windRange('10 to 15 mph')).toBe('10–15 mph')
    expect([0, 0.1, 12.7].map(fmtInches)).toEqual(['None', '<0.01 in', '0.50 in'])
  })
})

describe('parseDays', () => {
  it('previews exactly three valid dates, otherwise the wedding days', () => {
    expect(parseDays('2026-10-29,2026-10-30,2026-10-31')).toEqual({
      days: ['2026-10-29', '2026-10-30', '2026-10-31'],
      preview: true,
    })
    expect(parseDays('2026-10-29,nope')).toEqual({ days: WEDDING_DAYS, preview: false })
    expect(parseDays(undefined).preview).toBe(false)
  })
})

describe('predictKinds', () => {
  it('guesses each card’s shape from the date: full within six days, model read beyond, passed before today', () => {
    expect(predictKinds(WEDDING_DAYS, Date.parse('2026-10-27T12:00:00-04:00'))).toEqual(['model', 'model', 'model'])
    expect(predictKinds(WEDDING_DAYS, Date.parse('2026-10-31T10:00:00-04:00'))).toEqual(['full', 'full', 'model'])
    expect(predictKinds(WEDDING_DAYS, Date.parse('2026-11-07T09:30:00-05:00'))).toEqual(['passed', 'passed', 'full'])
  })
})
