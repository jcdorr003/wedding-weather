import { useLayoutEffect, useRef } from 'react'
import { pct } from '../../lib/forecast/format'
import { hoursFor, pastBefore } from '../../lib/forecast/timeline'
import { hourLabel } from '../../lib/time'
import type { Tip } from './useTooltip'

export const Tooltip = ({ tip, now }: { tip: Tip | null; now: number }) => {
  const ref = useRef<HTMLDivElement>(null)
  const hour = tip && tip.data ? hoursFor(tip.day, tip.data)[tip.hour] : null

  // Centred above the bar and kept inside the window; flips below the bar if there's no room above.
  useLayoutEffect(() => {
    const el = ref.current
    if (!tip || !el) return
    const bar = tip.col.getBoundingClientRect()
    const box = el.getBoundingClientRect()
    const pad = 8
    const left = Math.max(pad, Math.min(bar.left + bar.width / 2 - box.width / 2, window.innerWidth - box.width - pad))
    const above = bar.top - box.height - 8
    el.style.left = `${left}px`
    el.style.top = `${above < pad ? bar.bottom + 8 : above}px`
  }, [tip])

  return (
    <div ref={ref} id="tip" className="tip" role="tooltip" hidden={!tip}>
      {tip &&
        (hour ? (
          <>
            <b>
              {hourLabel(tip.hour)} · {pct(hour.pop)} rain
            </b>
            <br />
            {hour.temp}°F · {hour.sky}
            <br />
            Wind {hour.dir} {hour.wind}
          </>
        ) : (
          <>
            <b>{hourLabel(tip.hour)}</b>
            <br />
            {tip.hour < pastBefore(tip.day, now) ? 'Already passed' : 'No hourly data yet'}
          </>
        ))}
    </div>
  )
}
