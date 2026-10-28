import type { ReactNode } from 'react'
import { THRESHOLD } from '../../lib/config'
import { weekday } from '../../lib/time'

const X_LABELS = ['12a', '3a', '6a', '9a', '12p', '3p', '6p', '9p']

/** The chart frame (axes, grid lines, 20% line) around a day's 24 bars. Also used, empty, by the loading skeleton. */
export const Chart = ({ day, children }: { day: string; children?: ReactNode }) => (
  <div>
    <div className="chart">
      <div className="yaxis" aria-hidden="true">
        <span style={{ bottom: '100%' }}>100%</span>
        <span style={{ bottom: '50%' }}>50%</span>
        <span style={{ bottom: 0 }}>0%</span>
      </div>
      <div className="plot">
        <div className="gl" style={{ bottom: '100%' }} />
        <div className="gl" style={{ bottom: '50%' }} />
        <div className="gl" style={{ bottom: 0 }} />
        <div className="gl thresh" style={{ bottom: `${THRESHOLD}%` }} />
        <div className="bars" role="list" aria-label={`${weekday(day)} hourly chance of rain`}>
          {children}
        </div>
      </div>
    </div>
    <div className="xaxis" aria-hidden="true">
      {X_LABELS.map((t) => (
        <span key={t}>{t}</span>
      ))}
    </div>
  </div>
)

export const ChartKey = ({ clear }: { clear: boolean }) => (
  <div className="key">
    <span>
      <i className="sw" />
      {THRESHOLD}% or more
    </span>
    <span>
      <i className="sw soft" />
      Under {THRESHOLD}%
    </span>
    {clear && (
      <span>
        <i className="sw clear" />
        Dries out
      </span>
    )}
  </div>
)
