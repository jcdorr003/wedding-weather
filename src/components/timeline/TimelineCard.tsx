import { THRESHOLD } from '../../lib/config'
import { pct } from '../../lib/forecast/format'
import { pendingWhen } from '../../lib/forecast/day'
import { noDataText } from '../../lib/forecast/header'
import { hoursFor, pastBefore, verdict } from '../../lib/forecast/timeline'
import { fmtStamp, hourLabel, weekday } from '../../lib/time'
import type { Forecast, HourlyPeriod } from '../../lib/types'
import { CardHead } from '../DayCard'
import { Chart, ChartKey } from './Chart'

type Props = { day: string; data: Forecast | null; now: number; loadFailed: boolean; activeHour: number | null }

export const TimelineCard = ({ day, data, now, loadFailed, activeHour }: Props) => {
  const hours = hoursFor(day, data)
  const v = verdict(hours)
  const past = pastBefore(day, now)

  if (!v && (past >= 24 || !data)) {
    return (
      <article className="card tl">
        <CardHead day={day} />
        <div>
          <p className="verdict-sub">{past >= 24 ? 'This day has passed.' : noDataText(loadFailed)}</p>
        </div>
      </article>
    )
  }

  const list = hours.filter((h) => h != null)
  return (
    <article className="card tl">
      <CardHead day={day} />
      {v ? (
        <div>
          <p className="verdict-h">{v.head}</p>
          <p className="verdict-sub">{v.sub}</p>
        </div>
      ) : (
        <div>
          <p className="verdict-h">Hourly data not out yet</p>
          <p className="verdict-sub">
            The NWS hourly forecast currently runs through {data ? fmtStamp(data.hourlyEnd) : ''}. {weekday(day)}’s
            hours {pendingWhen(day, now)}.
          </p>
        </div>
      )}
      <Chart day={day}>
        {hours.map((h, i) => (
          <Bar
            key={i}
            day={day}
            hour={i}
            period={h}
            past={i < past}
            active={activeHour === i}
            clear={v?.clearAt === i}
          />
        ))}
      </Chart>
      <ChartKey clear={v?.clearAt != null} />
      {list.length > 0 && (
        <details>
          <summary>Hour by hour</summary>
          <ul className="hours">
            {list.map((h) => (
              <li key={h.hour}>
                <span className="t">{hourLabel(h.hour)}</span>
                <span>{pct(h.pop)}</span>
                <span>{h.temp}°</span>
                <span className="s">{h.sky}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </article>
  )
}

type BarProps = {
  day: string
  hour: number
  period: HourlyPeriod | null
  past: boolean
  active: boolean
  clear: boolean
}

// Each hour is focusable so keyboard users get its tooltip; the label carries the same details for screen readers.
const Bar = ({ day, hour, period, past, active, clear }: BarProps) => {
  const className = [
    'col',
    !period && 'missing',
    period && period.pop >= THRESHOLD && 'wet',
    period && clear && 'clear-start',
    active && 'active',
  ]
    .filter(Boolean)
    .join(' ')
  const label = period
    ? `${hourLabel(hour)}: ${pct(period.pop)} chance of rain, ${period.temp}°F, ${period.sky}`
    : `${hourLabel(hour)}: ${past ? 'already passed' : 'no hourly data yet'}`
  return (
    <div className={className} role="listitem" tabIndex={0} data-day={day} data-h={hour} aria-label={label}>
      <i style={period ? { height: `${Math.max(0, Math.min(100, period.pop))}%` } : undefined} />
    </div>
  )
}
