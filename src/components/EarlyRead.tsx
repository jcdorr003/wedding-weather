import type { EarlyRead as Read } from '../lib/forecast/day'

/** The early model read for days beyond the NWS forecast: day-level odds only. */
export const EarlyRead = ({ read }: { read: Read }) => (
  <>
    <p className="early-tag">Early model read</p>
    <p className="early-h">{read.head}</p>
    <p className="early-sub">{read.sub}</p>
    <div className="runs">
      {read.runs.map((run) => (
        <div key={run.name} className="run">
          <span className="run-name">{run.name}</span>
          <span className="run-bar" aria-hidden="true">
            <i style={{ width: `${run.share}%` }} />
          </span>
          <span className="run-n">
            {run.wet} of {run.total} runs
          </span>
        </div>
      ))}
    </div>
    <p className="pending">{read.pending}</p>
  </>
)
