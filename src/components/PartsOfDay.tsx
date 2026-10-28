import type { Parts } from '../lib/forecast/day'
import { fmtInches, pct } from '../lib/forecast/format'

/** "Rain by time of day": four 6-hour blocks matching NWS's rain-amount periods. */
export const PartsOfDay = ({ parts }: { parts: Parts }) => (
  <div className="parts-wrap">
    <div className="parts-h">
      <span>Rain by time of day</span>
      <span>{parts.total && `${parts.total} expected${parts.totalFromNow ? ' from now' : ''}`}</span>
    </div>
    <div className="parts" role="list">
      {parts.blocks.map((block) => (
        <div key={block.name} className={block.past ? 'part past' : 'part'} role="listitem">
          <span className="part-name">{block.name}</span>
          <span className="part-range">{block.range}</span>
          <span className="part-pop">{block.past || block.chance == null ? '—' : pct(block.chance)}</span>
          <span className="part-amt">
            {block.past ? 'Passed' : block.amount == null ? '—' : fmtInches(block.amount)}
          </span>
        </div>
      ))}
    </div>
    {parts.note && <p className="parts-note">{parts.note}</p>}
  </div>
)
